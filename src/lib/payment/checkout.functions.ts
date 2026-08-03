import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { PaymentTransaction } from "./types";
import type { BookingReview } from "./checkout.server";

export type { BookingReview };

const idInput = (data: unknown) =>
  z.object({ request_id: z.string().uuid() }).strict().parse(data);

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
