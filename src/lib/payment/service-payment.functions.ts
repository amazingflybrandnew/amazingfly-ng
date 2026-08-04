import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ServicePaymentState =
  | {
      ok: true;
      requiresQuote: false;
      amount: number;
      currency: string;
      reference: string;
      status: string;
      serviceType: string;
    }
  | { ok: false; requiresQuote: boolean; message: string };

/**
 * Ensures a pending payment transaction exists for a universal travel service
 * (visa, police character certificate, future paid documents) once the
 * customer has completed the application. Flights and hotels use the same
 * `prepareCheckout` path, so nothing about those flows changes.
 */
export const ensureServicePayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<ServicePaymentState> => {
    const { requireUser } = await import("../auth.server");
    const { prepareCheckout } = await import("./checkout.server");
    const { user } = await requireUser();

    // Universal services are always charged through Paystack, so the pending
    // row is tagged with that provider up front (flight/hotel keep "manual").
    const prepared = await prepareCheckout(user, data.request_id, { provider: "paystack" });
    if (!prepared.ok) {
      return {
        ok: false,
        requiresQuote: prepared.message.toLowerCase().includes("quotation"),
        message: prepared.message,
      };
    }

    return {
      ok: true,
      requiresQuote: false,
      amount: prepared.transaction.amount,
      currency: prepared.transaction.currency,
      reference: prepared.transaction.transaction_reference,
      status: prepared.transaction.status,
      serviceType: prepared.review.serviceType,
    };
  });
