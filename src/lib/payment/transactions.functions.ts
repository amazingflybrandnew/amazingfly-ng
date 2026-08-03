import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { PaymentTransaction } from "./types";

export type { PaymentTransaction };

/** Signed-in customer: their own payment transactions (RLS + user scoped). */
export const getMyPaymentTransactions = createServerFn({ method: "POST" }).handler(
  async (): Promise<PaymentTransaction[]> => {
    const { requireUser } = await import("../auth.server");
    const { listCustomerTransactions } = await import("./transactions.server");
    const { user } = await requireUser();
    return listCustomerTransactions(user);
  },
);

/** Admin: transactions for a single request (used by request detail views). */
export const getRequestPaymentTransactions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<PaymentTransaction[]> => {
    const { requireAdmin } = await import("../admin.server");
    const { listRequestTransactions } = await import("./transactions.server");
    await requireAdmin("manage_payments");
    return listRequestTransactions(data.request_id);
  });
