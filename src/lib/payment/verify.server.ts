/**
 * Server-only Paystack verification for Amazingfly Travels.
 * Payment success is persisted before any supplier-booking action is attempted.
 */
import type { TransactionStatus } from "./types";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const ZERO_DECIMAL: readonly string[] = [];
const PAYSTACK_IN_PROGRESS_STATUSES = new Set(["ongoing", "pending", "processing", "queued"]);
const RATEHAWK_CERTIFICATION_SCENARIOS = new Set([
  "unknown_success",
  "unknown_soldout",
  "unknown_book_limit",
]);

type RateHawkCertificationScenario =
  | "unknown_success"
  | "unknown_soldout"
  | "unknown_book_limit";

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

function rateHawkCertificationScenario(value: unknown): RateHawkCertificationScenario | null {
  const scenario = String(value ?? "").trim();
  return RATEHAWK_CERTIFICATION_SCENARIOS.has(scenario)
    ? (scenario as RateHawkCertificationScenario)
    : null;
}

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
      | { status?: boolean; message?: string; data?: Record<string, unknown> }
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

/**
 * Marks customer payment received. Supplier-backed bookings remain processing
 * until the relevant supplier integration has actually confirmed/issued them.
 */
async function confirmBooking(requestId: string) {
  const supabase = await admin();
  const { data } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  const row = (data as Record<string, unknown> | null) ?? {};

  const category = String(row["service_category"] ?? "").toLowerCase();
  const serviceType = String(row["service_type"] ?? "").toLowerCase();
  const isFlight = category === "flights" || serviceType.includes("flight");
  const isHotel = category === "hotels" || serviceType.includes("hotel");
  const isBooking = isFlight || isHotel;

  const paidAt = new Date().toISOString();
  const patch: Record<string, unknown> = {
    payment_status: "payment_received",
    booking_status: "processing",
    paid_at: paidAt,
  };
  if (!isBooking) patch["request_status"] = "processing";

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

  const status = "processing";
  const message = isHotel
    ? "Payment received. Hotel confirmation is now processing with the accommodation provider."
    : isFlight
      ? "Payment received. Flight booking is now processing and will be confirmed after airline issuance."
      : "Payment received. Amazingfly Travels has started processing your request.";

  await supabase.from("request_updates").insert({ request_id: requestId, status, message });

  return {
    isHotel,
    hotelPaymentType: String(row["hotel_payment_type"] ?? ""),
  };
}

/**
 * Idempotently starts the supplier booking for a successfully paid RateHawk
 * `deposit` rate. A supplier failure never reverses a verified customer payment.
 */
async function ensurePaidHotelBooking(requestId: string): Promise<void> {
  const supabase = await admin();
  const { data } = await supabase
    .from("service_requests")
    .select("service_category, service_type, hotel_payment_type, hotel_certification_scenario")
    .eq("id", requestId)
    .maybeSingle();
  const row = (data as Record<string, unknown> | null) ?? {};
  const isHotel =
    String(row["service_category"] ?? "").toLowerCase() === "hotels" ||
    String(row["service_type"] ?? "").toLowerCase().includes("hotel");
  if (!isHotel || String(row["hotel_payment_type"] ?? "") !== "deposit") return;

  const certificationScenario = rateHawkCertificationScenario(
    row["hotel_certification_scenario"],
  );

  try {
    const { bookStoredHotelRequest } = await import("../travel-api/hotel-booking.server");
    await bookStoredHotelRequest(requestId, "deposit", certificationScenario);
  } catch (error) {
    // Payment remains successful; booking status/error is handled by hotel booking persistence.
    console.error("[paystack] paid hotel supplier booking failed", error);
  }
}

async function setRequestPaymentState(requestId: string, paymentStatus: string) {
  const supabase = await admin();
  const { error } = await supabase
    .from("service_requests")
    .update({ payment_status: paymentStatus })
    .eq("id", requestId);
  if (error) console.error("[paystack] setRequestPaymentState", error.message);
}

async function markRequestPaymentFailed(requestId: string) {
  await setRequestPaymentState(requestId, "payment_failed");
}

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

  // A callback refresh can safely re-enter here; supplier booking is also idempotent by request_id.
  if (currentStatus === "successful") {
    if (requestId) await ensurePaidHotelBooking(requestId);
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

  if (data.reference !== reference) {
    console.error("[paystack] reference mismatch", { expected: reference, got: data.reference });
    return {
      ok: false,
      message: "Paystack returned a different transaction reference. Please contact support.",
      requestId,
    };
  }

  if (PAYSTACK_IN_PROGRESS_STATUSES.has(paystackStatus)) {
    await supabase
      .from("payment_transactions")
      .update({ status: "pending", provider_response: safeProviderResponse(data, "verified_pending") })
      .eq("id", String(tx["id"]));
    if (requestId) await setRequestPaymentState(requestId, "pending_payment");
    return {
      ok: true,
      status: "pending",
      requestId: requestId ?? "",
      reference,
      amount,
      currency,
      alreadyProcessed: false,
    };
  }

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

  // Atomically claim the successful transition. If the webhook, browser callback
  // and an admin reconciliation race one another, PostgreSQL re-checks the
  // `status != successful` predicate after the row lock is released. Only the
  // winning request receives a row back and is allowed to run side effects.
  const { data: claimedRows, error: updateError } = await supabase
    .from("payment_transactions")
    .update({
      status: "successful",
      provider: "paystack",
      payment_method: data.channel,
      paid_at: data.paidAt ?? new Date().toISOString(),
      provider_response: safeProviderResponse(data, "verified"),
    })
    .eq("id", String(tx["id"]))
    .neq("status", "successful")
    .select("id");

  if (updateError) {
    console.error("[paystack] complete transaction", updateError.message);
    return { ok: false, message: "We could not save your payment. Please contact support.", requestId };
  }

  if (!claimedRows?.length) {
    if (requestId) await ensurePaidHotelBooking(requestId);
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

  if (requestId) {
    const booking = await confirmBooking(requestId);
    if (booking.isHotel && booking.hotelPaymentType === "deposit") {
      await ensurePaidHotelBooking(requestId);
    }

    try {
      const { notifyPaymentReceived, notifyAdminPaidRequest } = await import(
        "../notifications.server"
      );
      const { formatMoney } = await import("../payment-status");
      const amountLabel = formatMoney(amount, currency);
      await notifyPaymentReceived({
        requestId,
        amountLabel,
        transactionReference: reference,
      });
      await notifyAdminPaidRequest({ requestId, amountLabel, transactionReference: reference });
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
