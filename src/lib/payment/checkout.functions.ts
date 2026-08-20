import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { PaymentTransaction } from "./types";
import type { BookingReview } from "./checkout.server";

export type { BookingReview };

const idInput = (data: unknown) =>
  z.object({ request_id: z.string().uuid() }).strict().parse(data);

const addOnInput = (data: unknown) =>
  z
    .object({ request_id: z.string().uuid(), add_ons: z.array(z.string()).max(10) })
    .strict()
    .parse(data);

export const saveFlightAddOns = createServerFn({ method: "POST" })
  .inputValidator(addOnInput)
  .handler(async ({ data }) => {
    const { requireUser } = await import("../auth.server");
    const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
    const { normalizeFlightAddOns } = await import("../booking/flight-addons");
    const { user } = await requireUser();
    const db = createExternalSupabaseAdmin();
    const { data: request } = await db
      .from("service_requests")
      .select("id,user_id,email,service_category,catalogue_id")
      .eq("id", data.request_id)
      .maybeSingle();
    if (!request || String(request.service_category).toLowerCase() !== "flights") {
      return { ok: false as const, message: "This option is only available for flight bookings." };
    }
    const owns = String(request.user_id ?? "") === user.id ||
      (!request.user_id && String(request.email ?? "").toLowerCase() === user.email.toLowerCase());
    if (!owns) {
      return { ok: false as const, message: "We could not find that flight on your account." };
    }
    const { isVisaFlightReservation } = await import("../visa-flight-reservation");
    if (isVisaFlightReservation(request.catalogue_id)) {
      return { ok: false as const, message: "Add-ons do not apply to visa flight reservations." };
    }
    const addOns = normalizeFlightAddOns(data.add_ons);
    const { error } = await db
      .from("service_requests")
      .update({ flight_add_ons: addOns })
      .eq("id", data.request_id)
      .eq("service_category", "flights");
    if (error) return { ok: false as const, message: "Could not save the selected services." };
    await db.from("payment_transactions").delete().eq("request_id", data.request_id).eq("status", "pending");
    return { ok: true as const, addOns };
  });

/** Booking review payload for the signed-in customer (flight or hotel). */
export const getBookingReview = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }): Promise<BookingReview | null> => {
    const { requireUser } = await import("../auth.server");
    const { loadBookingReview } = await import("./checkout.server");
    const { user } = await requireUser();
    return loadBookingReview(user, data.request_id);
  });

/**
 * "Continue to Payment" — creates a pending, manual transaction against the
 * existing request. No payment provider is called.
 */
export const startBookingCheckout = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; transaction: PaymentTransaction } | { ok: false; message: string }> => {
      const { requireUser } = await import("../auth.server");
      const { prepareCheckout } = await import("./checkout.server");
      const { user } = await requireUser();
      const result = await prepareCheckout(user, data.request_id);
      return result.ok ? { ok: true, transaction: result.transaction } : result;
    },
  );
