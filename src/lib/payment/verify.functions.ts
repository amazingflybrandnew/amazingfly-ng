import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { BookingReview } from "./checkout.server";
import type { BookingPassengerRecord } from "../booking/passengers.server";

export type VerifyPaymentResult =
  | {
      ok: true;
      status: "pending" | "successful" | "failed" | "cancelled";
      requestId: string;
      reference: string;
      alreadyProcessed: boolean;
    }
  | { ok: false; message: string };

/**
 * Verifies a Paystack reference on the server after the customer returns from
 * checkout. Safe to call repeatedly — the underlying finaliser is idempotent.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ reference: z.string().min(6).max(120) }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<VerifyPaymentResult> => {
    const { requireUser } = await import("../auth.server");
    const { finalizePaystackPayment } = await import("./verify.server");
    const { user } = await requireUser();

    const result = await finalizePaystackPayment({
      reference: data.reference,
      ownerUserId: user.id,
    });

    if (!result.ok) return { ok: false, message: result.message };
    return {
      ok: true,
      status: result.status,
      requestId: result.requestId,
      reference: result.reference,
      alreadyProcessed: result.alreadyProcessed,
    };
  });

export type RateHawkSandboxDiagnostics = {
  partnerOrderId: string;
  orderId: string | null;
  status: string;
  providerStatus: string | null;
  errorMessage: string | null;
  attempts: number;
};

export type BookingConfirmation = {
  review: BookingReview;
  passengers: BookingPassengerRecord[];
  contactName: string;
  contactEmail: string;
  rateHawkDiagnostics: RateHawkSandboxDiagnostics | null;
};

/** Loads everything the confirmation page shows, scoped to the signed-in customer. */
export const getBookingConfirmation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<BookingConfirmation | null> => {
    const { requireUser } = await import("../auth.server");
    const { loadBookingReview } = await import("./checkout.server");
    const { loadPassengers } = await import("../booking/passengers.server");
    const { user } = await requireUser();

    const review = await loadBookingReview(user, data.request_id);
    if (!review) return null;

    const bundle = await loadPassengers(user, data.request_id);
    let rateHawkDiagnostics: RateHawkSandboxDiagnostics | null = null;

    if (review.kind === "hotel") {
      const { isRateHawkSandbox } = await import("../ratehawk.server");
      if (isRateHawkSandbox()) {
        const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
        const db = createExternalSupabaseAdmin();
        const { data: booking, error } = await db
          .from("hotel_bookings")
          .select("partner_order_id, order_id, status, provider_status, error_message, attempts")
          .eq("request_id", data.request_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[hotel-booking] sandbox diagnostics load failed", error.message);
        } else if (booking) {
          const row = booking as Record<string, unknown>;
          rateHawkDiagnostics = {
            partnerOrderId: String(row["partner_order_id"] ?? ""),
            orderId: row["order_id"] != null ? String(row["order_id"]) : null,
            status: String(row["status"] ?? ""),
            providerStatus: row["provider_status"] != null ? String(row["provider_status"]) : null,
            errorMessage: row["error_message"] != null ? String(row["error_message"]) : null,
            attempts: Number(row["attempts"] ?? 0),
          };
        }
      }
    }

    return {
      review,
      passengers: bundle?.passengers ?? [],
      contactName: bundle?.contact?.fullName ?? user.full_name ?? "",
      contactEmail: bundle?.contact?.email ?? user.email,
      rateHawkDiagnostics,
    };
  });
