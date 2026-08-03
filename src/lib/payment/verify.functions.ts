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

export type BookingConfirmation = {
  review: BookingReview;
  passengers: BookingPassengerRecord[];
  contactName: string;
  contactEmail: string;
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

    return {
      review,
      passengers: bundle?.passengers ?? [],
      contactName: bundle?.contact?.fullName ?? user.full_name ?? "",
      contactEmail: bundle?.contact?.email ?? user.email,
    };
  });
