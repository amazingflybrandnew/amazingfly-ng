import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  VISA_FLIGHT_RESERVATION_FEE_NGN,
  VISA_FLIGHT_RESERVATION_ID,
} from "../visa-flight-reservation";

export const prepareVisaFlightReservation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("../auth.server");
    const { user } = await requireUser();
    const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
    const supabase = createExternalSupabaseAdmin();
    const { data: request } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", data.request_id)
      .eq("user_id", user.id)
      .maybeSingle();
    const row = (request as Record<string, unknown> | null) ?? null;
    if (!row || String(row["service_category"] ?? "").toLowerCase() !== "flights") {
      return { ok: false as const, message: "Visa flight reservations are available only for flights." };
    }
    if (String(row["payment_status"] ?? "") === "payment_received") {
      return { ok: false as const, message: "This flight has already been paid." };
    }
    const offerId = String(row["flight_offer_id"] ?? "");
    const { getOfferInfo } = await import("../travel-api/flights.server");
    const info = offerId ? await getOfferInfo(offerId) : null;
    if (!info?.supportsHold) {
      return {
        ok: false as const,
        message: "This airline does not permit a temporary reservation for the selected fare.",
      };
    }
    const { count } = await supabase
      .from("booking_passengers")
      .select("id", { count: "exact", head: true })
      .eq("request_id", data.request_id);
    if (!count) {
      return { ok: false as const, message: "Please add traveller details before continuing." };
    }

    const { error } = await supabase
      .from("service_requests")
      .update({
        catalogue_id: VISA_FLIGHT_RESERVATION_ID,
        service_type: "Visa Flight Reservation",
        amount: VISA_FLIGHT_RESERVATION_FEE_NGN,
        currency: "NGN",
      })
      .eq("id", data.request_id)
      .eq("user_id", user.id)
      .eq("service_category", "flights");
    if (error) return { ok: false as const, message: "We could not prepare this reservation." };

    // The normal flight checkout may already have created a pending airfare
    // transaction. Re-scope that still-unpaid row to the visa service fee and
    // rotate its reference so an earlier Paystack link cannot charge airfare.
    const { buildTransactionReference } = await import("../payment/transactions.server");
    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .update({
        amount: VISA_FLIGHT_RESERVATION_FEE_NGN,
        currency: "NGN",
        transaction_reference: buildTransactionReference(),
        provider: "manual",
        provider_response: null,
      })
      .eq("request_id", data.request_id)
      .eq("status", "pending");
    if (transactionError) {
      return { ok: false as const, message: "We could not update the reservation payment." };
    }
    return { ok: true as const };
  });
