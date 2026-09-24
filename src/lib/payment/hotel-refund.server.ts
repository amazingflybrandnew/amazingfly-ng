/**
 * Server-only safety net: a customer must never stay charged for a hotel
 * booking the supplier definitively rejected. When a paid hotel booking fails,
 * the full payment is refunded through Paystack, the customer is told, and the
 * operations team is alerted. Never throws.
 */

const PAYSTACK_BASE_URL = "https://api.paystack.co";

async function db() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

type RefundResult = { ok: true; status: string } | { ok: false; message: string };

/** Requests a full Paystack refund for a successful transaction reference. */
export async function refundPaystackTransaction(reference: string): Promise<RefundResult> {
  const secret = process.env["PAYSTACK_SECRET_KEY"];
  if (!secret) return { ok: false, message: "PAYSTACK_SECRET_KEY is not configured." };
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: reference }),
    });
    const payload = (await response.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: { status?: string };
    } | null;
    if (!response.ok || !payload?.status) {
      return {
        ok: false,
        message: payload?.message ?? `Paystack refund failed (${response.status}).`,
      };
    }
    return { ok: true, status: String(payload.data?.status ?? "pending") };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Paystack refund error.",
    };
  }
}

/**
 * Refunds a paid hotel request whose supplier booking definitively failed.
 * Idempotent: only the first caller moves payment_status from
 * payment_received to refund_requested and performs the refund.
 */
export async function refundFailedPaidHotelBooking(
  requestId: string,
  reason: string,
): Promise<void> {
  try {
    const supabase = await db();
    const { data: claimed, error: claimError } = await supabase
      .from("service_requests")
      .update({ payment_status: "refund_requested" })
      .eq("id", requestId)
      .eq("payment_status", "payment_received")
      .select("id");
    if (claimError) {
      console.error("[hotel-refund] claim failed", claimError.message);
      return;
    }
    if (!claimed?.length) return; // not paid, or already refunded/handled

    const { data: transaction } = await supabase
      .from("payment_transactions")
      .select("id, transaction_reference, amount, currency, provider_response")
      .eq("request_id", requestId)
      .eq("status", "successful")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const tx = transaction as {
      id: string;
      transaction_reference: string;
      amount: number;
      currency: string;
      provider_response: Record<string, unknown> | null;
    } | null;

    const refund = tx
      ? await refundPaystackTransaction(tx.transaction_reference)
      : ({ ok: false, message: "No successful payment transaction found." } as const);

    if (tx) {
      await supabase
        .from("payment_transactions")
        .update({
          provider_response: {
            ...(tx.provider_response ?? {}),
            refund: {
              requested_at: new Date().toISOString(),
              reason,
              ok: refund.ok,
              ...(refund.ok ? { status: refund.status } : { error: refund.message }),
            },
          },
        })
        .eq("id", tx.id);
    }
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "processing",
      message: refund.ok
        ? "Hotel booking could not be confirmed by the supplier. Full refund initiated automatically."
        : "Hotel booking could not be confirmed by the supplier. Automatic refund FAILED — refund manually.",
    });

    const { notifyHotelBookingFailedRefund, notifyAdminHotelBookingIssue } =
      await import("../notifications.server");
    const amountLabel = tx ? `${tx.currency} ${Number(tx.amount).toLocaleString("en-NG")}` : "";
    await notifyHotelBookingFailedRefund({ requestId, amountLabel });
    await notifyAdminHotelBookingIssue({
      requestId,
      headline: refund.ok
        ? "Paid hotel booking failed - automatic refund initiated"
        : "URGENT: paid hotel booking failed - automatic refund FAILED, refund manually",
      details: [
        `Supplier reason: ${reason}`,
        tx ? `Transaction: ${tx.transaction_reference} (${amountLabel})` : "No transaction found",
        refund.ok ? `Paystack refund status: ${refund.status}` : `Refund error: ${refund.message}`,
      ],
    });
  } catch (error) {
    console.error("[hotel-refund] failed", requestId, error);
  }
}
