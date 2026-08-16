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

/**
 * Reconciles an online payment against Paystack itself. Staff can request a
 * fresh verification, but they cannot manufacture a successful payment state.
 */
export const reconcileAdminPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ payment_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("manage_payments");
    const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
    const supabase = createExternalSupabaseAdmin();

    const { data: payment, error } = await supabase
      .from("payment_transactions")
      .select("id, request_id, provider, transaction_reference, status")
      .eq("id", data.payment_id)
      .maybeSingle();

    if (error || !payment) {
      return { ok: false, message: error?.message ?? "Payment not found." };
    }

    const row = payment as Record<string, unknown>;
    const provider = String(row["provider"] ?? "").toLowerCase();
    const reference = String(row["transaction_reference"] ?? "").trim();
    const requestId = row["request_id"] ? String(row["request_id"]) : null;

    if (provider !== "paystack") {
      return {
        ok: false,
        message: "Only Paystack transactions can be reconciled automatically from this screen.",
      };
    }
    if (!reference) return { ok: false, message: "This transaction has no Paystack reference." };

    const { finalizePaystackPayment } = await import("./payment/verify.server");
    const result = await finalizePaystackPayment({ reference });

    let requestStatusRepaired = false;
    if (result.ok && result.status === "successful" && requestId) {
      const { data: request } = await supabase
        .from("service_requests")
        .select("payment_status")
        .eq("id", requestId)
        .maybeSingle();
      const storedStatus = String((request as Record<string, unknown> | null)?.["payment_status"] ?? "");

      if (storedStatus !== "payment_received") {
        const repaired = await supabase
          .from("service_requests")
          .update({ payment_status: "payment_received" })
          .eq("id", requestId);
        if (repaired.error) {
          console.error("[payments] reconciliation request-status repair", repaired.error.message);
        } else {
          requestStatusRepaired = true;
        }
      }
    }

    await logAdminAction(who, "Reconciled payment with Paystack", {
      type: "payment",
      id: data.payment_id,
      detail: result.ok
        ? `${reference}: ${result.status}${result.alreadyProcessed ? " (already processed)" : ""}${
            requestStatusRepaired ? " (request payment status repaired)" : ""
          }`
        : `${reference}: verification failed - ${result.message}`,
    });

    if (!result.ok) return { ok: false, message: result.message };

    const message =
      result.status === "successful"
        ? requestStatusRepaired
          ? "Paystack confirms this payment is successful. The request payment status was repaired to match."
          : result.alreadyProcessed
            ? "Paystack confirms this payment was already successfully processed."
            : "Paystack confirmed the payment successfully."
        : result.status === "pending"
          ? "Paystack still reports this payment as pending."
          : `Paystack reports this payment as ${result.status}.`;

    return { ok: true, message };
  });

/**
 * Legacy server action retained so old clients fail safely. Online payment
 * status must never be changed by staff without provider verification.
 */
export const setAdminPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ payment_id: z.string().uuid(), status: statusEnum }).strict().parse(data),
  )
  .handler(async (): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin } = await import("./admin.server");
    await requireAdmin("manage_payments");
    return {
      ok: false,
      message: "Direct payment status changes are disabled. Verify online payments with Paystack instead.",
    };
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
