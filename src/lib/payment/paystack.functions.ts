import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Starts a Paystack checkout for a pending transaction the signed-in customer
 * owns. Verification lives in a later stage — the row stays `pending` here.
 */
export const initializePayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(
    async ({ data }): Promise<{ ok: true; authorizationUrl: string } | { ok: false; message: string }> => {
      const { requireUser } = await import("../auth.server");
      const { startPaystackCheckout } = await import("./paystack.server");
      const { user } = await requireUser();
      const result = await startPaystackCheckout(user, data.request_id);
      return result.ok ? { ok: true, authorizationUrl: result.authorizationUrl } : result;
    },
  );
