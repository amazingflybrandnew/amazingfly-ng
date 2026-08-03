/**
 * Server-only Paystack VERIFICATION for Amazingfly Travels (Payment Part 3B).
 *
 * Initialization lives in `paystack.server.ts`. This module owns the other half
 * of the handshake: it asks Paystack whether a reference really was paid, then
 * completes the transaction and confirms the booking.
 *
 * Rules honoured here:
 *  - PAYSTACK_SECRET_KEY is read on the server only.
 *  - A payment is only marked successful when Paystack says `status: "success"`
 *    AND the amount + currency match what we asked for.
 *  - Re-running the same reference is safe (idempotent) — no duplicate rows.
 */
import type { TransactionStatus } from "./types";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const ZERO_DECIMAL: readonly string[] = [];

export type PaystackVerifyPayload = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  gatewayResponse: string | null;
};

export type FinalizeResult =
  | {
      ok: true;
      status: TransactionStatus;
      requestId: string;
      reference: string;
      amount: number;
      currency: string;
      alreadyProcessed: boolean;
    }
  | { ok: false; message: string; requestId?: string | null };

async function admin() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

function expectedSubunits(amount: number, currency: string): number {
  const factor = ZERO_DECIMAL.includes(currency.toUpperCase()) ? 1 : 100;
  return Math.round(amount * factor);
}

/** Calls Paystack's verify endpoint. Never called from the browser. */
export async function verifyPaystackTransaction(
  reference: string,
): Promise<{ ok: true; data: PaystackVerifyPayload } | { ok: false; message: string }> {
  const secret = process.env["PAYSTACK_SECRET_KEY"];
  if (!secret) {
    console.error("[paystack] PAYSTACK_SECRET_KEY is not configured");
    return { ok: false, message: "Payment verification is not available. Please contact support." };
  }

  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET", headers: { Authorization: `Bearer ${secret}` } },
    );

    const payload = (await response.json().catch(() => null)) as
      | {
          status?: boolean;
          message?: string;
          data?: Record<string, unknown>;
        }
      | null;

    if (!response.ok || !payload?.status || !payload.data) {
      console.error("[paystack] verify failed", response.status, payload?.message);
      return { ok: false, message: "We could not confirm this payment with Paystack." };
    }

    const d = payload.data;
    return {
      ok: true,
      data: {
        status: String(d["status"] ?? ""),
        reference: String(d["reference"] ?? reference),
        amount: Number(d["amount"] ?? 0),
        currency: String(d["currency"] ?? ""),
        channel: d["channel"] ? String(d["channel"]) : null,
        paidAt: d["paid_at"] ? String(d["paid_at"]) : null,
        gatewayResponse: d["gateway_response"] ? String(d["gateway_response"]) : null,
      },
    };
  } catch (error) {
    console.error("[paystack] verify error", error);
    return { ok: false, message: "We could not reach Paystack. Please try again in a moment." };
  }
}

/** Only non-sensitive fields are persisted in `provider_response`. */
function safeProviderResponse(data: PaystackVerifyPayload, stage: string) {
  return {
    stage,
    provider: "paystack",
    paystack_status: data.status,
    paystack_reference: data.reference,
    amount_subunits: data.amount,
    currency: data.currency,
    channel: data.channel,
    gateway_response: data.gatewayResponse,
    paid_at: data.paidAt,
    verified_at: new Date().toISOString(),
  };
}

/** Marks the booking confirmed and records provider booking references. */
async function confirmBooking(requestId: string) {
  const supabase = await admin();

  const { data } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  const row = (data as Record<string, unknown> | null) ?? {};

  const patch: Record<string, unknown> = {
    payment_status: "payment_received",
    booking_status: "confirmed",
  };

  // Carry any provider reference we already hold forward into the booking
  // reference column so confirmation surfaces show something meaningful.
  const pnr = row["pnr"] ?? row["booking_reference"] ?? null;
  if (pnr) {
    patch["booking_reference"] = String(pnr);
    patch["pnr"] = String(pnr);
    if (!row["airline_reference"]) patch["airline_reference"] = String(pnr);
  }

  let { error } = await supabase.from("service_requests").update(patch).eq("id", requestId);
  if (error?.code === "42703" || error?.code === "PGRST204") {
    ({ error } = await supabase
      .from("service_requests")
      .update({ payment_status: "payment_received" })
      .eq("id", requestId));
  }
  if (error) console.error("[paystack] confirmBooking", error.message);

  await supabase.from("request_updates").insert({
    request_id: requestId,
    status: "confirmed",
    message: "Payment received and booking confirmed.",
  });
}

async function markRequestPaymentFailed(requestId: string) {
  const supabase = await admin();
  const { error } = await supabase
    .from("service_requests")
    .update({ payment_status: "payment_failed" })
    .eq("id", requestId);
  if (error) console.error("[paystack] markRequestPaymentFailed", error.message);
}

/**
 * Verifies a Paystack reference and completes the matching transaction.
 *
 * `ownerUserId` (optional) enforces that the signed-in customer owns the
 * transaction. The webhook path omits it because Paystack is the caller.
 */
export async function finalizePaystackPayment(input: {
  reference: string;
  ownerUserId?: string | null;
}): Promise<FinalizeResult> {
  const reference = input.reference.trim();
  if (!reference) return { ok: false, message: "Missing payment reference." };

  const supabase = await admin();

  const { data: txRow, error: txError } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("transaction_reference", reference)
    .maybeSingle();

  if (txError) console.error("[paystack] lookup transaction", txError.message);
  const tx = (txRow as Record<string, unknown> | null) ?? null;
  if (!tx) return { ok: false, message: "We could not find that payment on our records." };

  const requestId = tx["request_id"] ? String(tx["request_id"]) : null;
  const txUserId = tx["user_id"] ? String(tx["user_id"]) : null;

  if (input.ownerUserId && txUserId && txUserId !== input.ownerUserId) {
    return { ok: false, message: "This payment does not belong to your account." };
  }

  const currentStatus = String(tx["status"] ?? "pending") as TransactionStatus;
  const amount = Number(tx["amount"] ?? 0);
  const currency = String(tx["currency"] ?? "NGN");

  // Idempotency — a refreshed callback page must not re-process anything.
  if (currentStatus === "successful") {
    return {
      ok: true,
      status: "successful",
      requestId: requestId ?? "",
      reference,
      amount,
      currency,
      alreadyProcessed: true,
    };
  }

  const verified = await verifyPaystackTransaction(reference);
  if (!verified.ok) return { ok: false, message: verified.message, requestId };

  const data = verified.data;
  const paystackStatus = data.status.toLowerCase();

  if (paystackStatus !== "success") {
    const failed: TransactionStatus = paystackStatus === "abandoned" ? "cancelled" : "failed";
    await supabase
      .from("payment_transactions")
      .update({ status: failed, provider_response: safeProviderResponse(data, "verified") })
      .eq("id", String(tx["id"]));
    if (requestId) await markRequestPaymentFailed(requestId);
    return {
      ok: true,
      status: failed,
      requestId: requestId ?? "",
      reference,
      amount,
      currency,
      alreadyProcessed: false,
    };
  }

  // Amount + currency must match what we asked Paystack to charge.
  const expected = expectedSubunits(amount, currency);
  const currencyMatches = data.currency.toUpperCase() === currency.toUpperCase();
  if (!currencyMatches || data.amount < expected) {
    console.error("[paystack] mismatch", { reference, expected, got: data.amount, currency });
    await supabase
      .from("payment_transactions")
      .update({ status: "failed", provider_response: safeProviderResponse(data, "mismatch") })
      .eq("id", String(tx["id"]));
    if (requestId) await markRequestPaymentFailed(requestId);
    return {
      ok: false,
      message: "The amount paid does not match this booking. Our team will contact you.",
      requestId,
    };
  }

  const { error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      status: "successful",
      provider: "paystack",
      payment_method: data.channel,
      paid_at: data.paidAt ?? new Date().toISOString(),
      provider_response: safeProviderResponse(data, "verified"),
    })
    .eq("id", String(tx["id"]));

  if (updateError) {
    console.error("[paystack] complete transaction", updateError.message);
    return { ok: false, message: "We could not save your payment. Please contact support.", requestId };
  }

  if (requestId) {
    await confirmBooking(requestId);
    try {
      const { notifyPaymentReceived } = await import("../notifications.server");
      const { formatMoney } = await import("../payment-status");
      await notifyPaymentReceived({
        requestId,
        amountLabel: formatMoney(amount, currency),
        transactionReference: reference,
      });
    } catch (error) {
      console.error("[paystack] notify", error);
    }
  }

  return {
    ok: true,
    status: "successful",
    requestId: requestId ?? "",
    reference,
    amount,
    currency,
    alreadyProcessed: false,
  };
}
