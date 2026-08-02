import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { PAYMENT_STATUSES } from "./payment-status";
import type { AdminPaymentRow, PaymentSummary } from "./payments.server";

export type { AdminPaymentRow, PaymentSummary };

const statusEnum = z.enum(PAYMENT_STATUSES);

// ------------------------------------------------------------------ customer

export const getPaymentSummary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<PaymentSummary | null> => {
    const { requireUser } = await import("./auth.server");
    const { loadPaymentSummary } = await import("./payments.server");
    const { user } = await requireUser();
    return loadPaymentSummary(user, data.request_id);
  });

export const startRequestPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ request_id: z.string().uuid(), origin: z.string().trim().url().max(300) })
      .strict()
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; reference: string; authorizationUrl: string | null } | { ok: false; message: string }
    > => {
      const { requireUser } = await import("./auth.server");
      const { startPayment } = await import("./payments.server");
      const { user } = await requireUser();
      return startPayment(user, data.request_id, data.origin.replace(/\/$/, ""));
    },
  );

export const confirmRequestPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        reference: z.string().trim().min(4).max(200),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("./auth.server");
    const { verifyPayment } = await import("./payments.server");
    const { user } = await requireUser();
    return verifyPayment(user, data.request_id, data.reference);
  });

export const requestPaymentRefund = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireUser } = await import("./auth.server");
    const { requestRefund } = await import("./payments.server");
    const { user } = await requireUser();
    return requestRefund(user, data.request_id);
  });

// --------------------------------------------------------------------- admin

export const getAdminPayments = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.string().trim().max(40).optional(),
        search: z.string().trim().max(120).optional(),
      })
      .strict()
      .parse(data ?? {}),
  )
  .handler(
    async ({ data }): Promise<{ rows: AdminPaymentRow[]; totals: Record<string, number>; revenue: number }> => {
      const { requireAdmin } = await import("./admin.server");
      const { loadAdminPayments } = await import("./payments.server");
      await requireAdmin("manage_payments");
      return loadAdminPayments(data);
    },
  );

export const setAdminPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ payment_id: z.string().uuid(), status: statusEnum }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { adminSetPaymentStatus } = await import("./payments.server");
    const who = await requireAdmin("manage_payments");
    const result = await adminSetPaymentStatus(data.payment_id, data.status);
    if (result.ok) {
      await logAdminAction(who, "Updated payment status", {
        type: "payment",
        id: data.payment_id,
        detail: `Set to ${data.status}`,
      });
    }
    return result;
  });

export const setAdminRequestFee = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ request_id: z.string().uuid(), amount: z.number().nonnegative().max(1_000_000_000) })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { adminSetRequestFee } = await import("./payments.server");
    const who = await requireAdmin("manage_payments");
    const result = await adminSetRequestFee(data.request_id, data.amount);
    if (result.ok) {
      await logAdminAction(who, "Updated agreed fee", {
        type: "request",
        id: data.request_id,
        detail: `Amount payable set to ${data.amount}`,
      });
    }
    return result;
  });
