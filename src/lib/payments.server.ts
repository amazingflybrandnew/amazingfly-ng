/**
 * Server-only payment layer for Amazingfly Travels.
 *
 * The provider is pluggable: Paystack and Flutterwave are both implemented
 * behind the same small interface, so the active provider can be switched with
 * the PAYMENT_PROVIDER environment variable without touching any page code.
 * When no provider key is configured the layer falls back to "offline" mode:
 * the payment record is still created and the customer is told that our team
 * will send payment instructions.
 */
import type { SessionUser } from "./auth.server";
import { normalizePaymentStatus, type PaymentStatus } from "./payment-status";

export type PaymentProviderId = "paystack" | "flutterwave" | "offline";

export type PaymentRecord = {
  id: string;
  request_id: string;
  amount: number | null;
  currency: string;
  payment_provider: string;
  transaction_reference: string;
  status: PaymentStatus;
  created_at: string;
};

export type PaymentSummary = {
  request: {
    id: string;
    request_reference: string;
    service_type: string | null;
    service_category: string | null;
    destination_country: string | null;
    origin_country: string | null;
    travel_date: string | null;
    request_status: string;
    full_name: string | null;
    email: string | null;
    created_at: string;
  };
  amount: number | null;
  currency: string;
  payment_status: PaymentStatus;
  provider: PaymentProviderId;
  providerLabel: string;
  payments: PaymentRecord[];
};

const CURRENCY = "NGN";

async function admin() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

// ------------------------------------------------------------------ provider

type InitInput = {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  requestReference: string;
};

type InitResult = { ok: true; authorizationUrl: string | null } | { ok: false; message: string };

type VerifyResult = { status: "success" | "failed" | "pending"; amount?: number | undefined };

type Provider = {
  id: PaymentProviderId;
  label: string;
  configured: () => boolean;
  initialize: (input: InitInput) => Promise<InitResult>;
  verify: (reference: string) => Promise<VerifyResult>;
};

const paystack: Provider = {
  id: "paystack",
  label: "Paystack",
  configured: () => Boolean(process.env["PAYSTACK_SECRET_KEY"]),
  initialize: async (input) => {
    const key = process.env["PAYSTACK_SECRET_KEY"]!;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: { request_reference: input.requestReference },
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { status?: boolean; message?: string; data?: { authorization_url?: string } }
      | null;
    if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
      return { ok: false, message: payload?.message ?? "Paystack could not start this payment." };
    }
    return { ok: true, authorizationUrl: payload.data.authorization_url };
  },
  verify: async (reference) => {
    const key = process.env["PAYSTACK_SECRET_KEY"]!;
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const payload = (await response.json().catch(() => null)) as
      | { data?: { status?: string; amount?: number } }
      | null;
    const status = payload?.data?.status;
    if (status === "success") {
      return { status: "success", amount: (payload?.data?.amount ?? 0) / 100 };
    }
    if (status === "failed" || status === "abandoned") return { status: "failed" };
    return { status: "pending" };
  },
};

const flutterwave: Provider = {
  id: "flutterwave",
  label: "Flutterwave",
  configured: () => Boolean(process.env["FLUTTERWAVE_SECRET_KEY"]),
  initialize: async (input) => {
    const key = process.env["FLUTTERWAVE_SECRET_KEY"]!;
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.callbackUrl,
        customer: { email: input.email },
        customizations: {
          title: "Amazingfly Travels",
          description: `Payment for ${input.requestReference}`,
        },
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { status?: string; message?: string; data?: { link?: string } }
      | null;
    if (!response.ok || payload?.status !== "success" || !payload.data?.link) {
      return {
        ok: false,
        message: payload?.message ?? "Flutterwave could not start this payment.",
      };
    }
    return { ok: true, authorizationUrl: payload.data.link };
  },
  verify: async (reference) => {
    const key = process.env["FLUTTERWAVE_SECRET_KEY"]!;
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
        reference,
      )}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const payload = (await response.json().catch(() => null)) as
      | { data?: { status?: string; amount?: number } }
      | null;
    const status = payload?.data?.status;
    if (status === "successful") return { status: "success", amount: payload?.data?.amount ?? 0 };
    if (status === "failed") return { status: "failed" };
    return { status: "pending" };
  },
};

const offline: Provider = {
  id: "offline",
  label: "Bank transfer (arranged by our team)",
  configured: () => true,
  initialize: async () => ({ ok: true, authorizationUrl: null }),
  verify: async () => ({ status: "pending" }),
};

const PROVIDERS: Provider[] = [paystack, flutterwave];

export function activeProvider(): Provider {
  const preferred = (process.env["PAYMENT_PROVIDER"] ?? "").trim().toLowerCase();
  const chosen = PROVIDERS.find((p) => p.id === preferred && p.configured());
  return chosen ?? PROVIDERS.find((p) => p.configured()) ?? offline;
}

function providerFor(id: string): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? offline;
}

function newReference(requestReference: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AFPAY-${requestReference || "REQ"}-${Date.now().toString(36).toUpperCase()}-${random}`;
}

// ------------------------------------------------------------------ requests

const REQUEST_COLUMNS =
  "id, request_reference, service_type, destination_country, origin_country, travel_date, request_status, full_name, email, created_at, agreed_fee, payment_status";

async function ownedRequest(user: SessionUser, requestId: string) {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("service_requests")
    .select(`${REQUEST_COLUMNS}, service_category, user_id`)
    .eq("id", requestId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const ownsById = row["user_id"] === user.id;
  const ownsByEmail =
    String(row["email"] ?? "").toLowerCase() === user.email.toLowerCase() && user.email !== "";
  if (!ownsById && !ownsByEmail) return null;
  return row;
}

function shapePayment(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row["id"]),
    request_id: String(row["request_id"] ?? ""),
    amount: row["amount"] === null || row["amount"] === undefined ? null : Number(row["amount"]),
    currency: String(row["currency"] ?? CURRENCY),
    payment_provider: String(row["payment_provider"] ?? "offline"),
    transaction_reference: String(row["transaction_reference"] ?? ""),
    status: normalizePaymentStatus(row["status"]),
    created_at: String(row["created_at"] ?? ""),
  };
}

async function paymentsForRequests(requestIds: string[]): Promise<PaymentRecord[]> {
  if (!requestIds.length) return [];
  const supabase = await admin();
  const { data, error } = await supabase
    .from("payments")
    .select("id, request_id, amount, currency, payment_provider, transaction_reference, status, created_at")
    .in("request_id", requestIds)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[payments] list", error.message);
    return [];
  }
  return (data ?? []).map((row) => shapePayment(row as Record<string, unknown>));
}

export async function loadPaymentSummary(
  user: SessionUser,
  requestId: string,
): Promise<PaymentSummary | null> {
  const row = await ownedRequest(user, requestId);
  if (!row) return null;
  const provider = activeProvider();
  const payments = await paymentsForRequests([requestId]);
  const amount =
    row["agreed_fee"] === null || row["agreed_fee"] === undefined
      ? null
      : Number(row["agreed_fee"]);

  return {
    request: {
      id: String(row["id"]),
      request_reference: String(row["request_reference"] ?? ""),
      service_type: (row["service_type"] as string | null) ?? null,
      service_category: (row["service_category"] as string | null) ?? null,
      destination_country: (row["destination_country"] as string | null) ?? null,
      origin_country: (row["origin_country"] as string | null) ?? null,
      travel_date: (row["travel_date"] as string | null) ?? null,
      request_status: String(row["request_status"] ?? "new_request"),
      full_name: (row["full_name"] as string | null) ?? null,
      email: (row["email"] as string | null) ?? null,
      created_at: String(row["created_at"] ?? ""),
    },
    amount,
    currency: CURRENCY,
    payment_status: normalizePaymentStatus(row["payment_status"]),
    provider: provider.id,
    providerLabel: provider.label,
    payments,
  };
}

async function setRequestPaymentStatus(requestId: string, status: PaymentStatus) {
  const supabase = await admin();
  const { error } = await supabase
    .from("service_requests")
    .update({ payment_status: status })
    .eq("id", requestId);
  if (error) console.error("[payments] request status", error.message);
}

export async function startPayment(
  user: SessionUser,
  requestId: string,
  origin: string,
): Promise<
  { ok: true; reference: string; authorizationUrl: string | null } | { ok: false; message: string }
> {
  const row = await ownedRequest(user, requestId);
  if (!row) return { ok: false, message: "Request not found." };

  const amount = row["agreed_fee"] === null || row["agreed_fee"] === undefined ? null : Number(row["agreed_fee"]);
  if (!amount || amount <= 0) {
    return {
      ok: false,
      message: "An amount has not been agreed for this request yet. Our team will confirm it shortly.",
    };
  }
  if (normalizePaymentStatus(row["payment_status"]) === "payment_received") {
    return { ok: false, message: "This request has already been paid for." };
  }

  const provider = activeProvider();
  const requestReference = String(row["request_reference"] ?? "");
  const reference = newReference(requestReference);
  const email = String(row["email"] ?? user.email);
  const callbackUrl = `${origin}/payment/${requestId}?reference=${encodeURIComponent(reference)}`;

  const init = await provider.initialize({
    email,
    amount,
    currency: CURRENCY,
    reference,
    callbackUrl,
    requestReference,
  });
  if (!init.ok) return init;

  const supabase = await admin();
  const { error } = await supabase.from("payments").insert({
    request_id: requestId,
    user_id: user.id,
    email,
    amount,
    currency: CURRENCY,
    payment_provider: provider.id,
    transaction_reference: reference,
    status: "pending_payment",
  });
  if (error) {
    console.error("[payments] insert", error.message);
    return { ok: false, message: "We could not start this payment. Please try again." };
  }

  await setRequestPaymentStatus(requestId, "pending_payment");
  return { ok: true, reference, authorizationUrl: init.authorizationUrl };
}

export async function verifyPayment(
  user: SessionUser,
  requestId: string,
  reference: string,
): Promise<{ ok: boolean; status: PaymentStatus; message?: string }> {
  const row = await ownedRequest(user, requestId);
  if (!row) return { ok: false, status: "pending_payment", message: "Request not found." };

  const supabase = await admin();
  const { data } = await supabase
    .from("payments")
    .select("id, request_id, amount, currency, payment_provider, transaction_reference, status, created_at")
    .eq("transaction_reference", reference)
    .eq("request_id", requestId)
    .maybeSingle();
  if (!data) return { ok: false, status: "pending_payment", message: "Payment not found." };

  const record = shapePayment(data as Record<string, unknown>);
  if (record.status === "payment_received") return { ok: true, status: record.status };

  const provider = providerFor(record.payment_provider);
  if (provider.id === "offline") return { ok: true, status: record.status };

  const result = await provider.verify(reference);
  const next: PaymentStatus =
    result.status === "success"
      ? "payment_received"
      : result.status === "failed"
        ? "payment_failed"
        : "pending_payment";

  if (next !== record.status) {
    await supabase.from("payments").update({ status: next }).eq("id", record.id);
    await setRequestPaymentStatus(requestId, next);
    if (next === "payment_received") {
      const { notifyPaymentReceived } = await import("./notifications.server");
      const { formatMoney } = await import("./payment-status");
      await notifyPaymentReceived({
        requestId,
        amountLabel: formatMoney(record.amount, record.currency),
        transactionReference: record.transaction_reference,
      });
    }
  }
  return { ok: true, status: next };
}

export async function requestRefund(
  user: SessionUser,
  requestId: string,
): Promise<{ ok: boolean; message?: string }> {
  const row = await ownedRequest(user, requestId);
  if (!row) return { ok: false, message: "Request not found." };
  if (normalizePaymentStatus(row["payment_status"]) !== "payment_received") {
    return { ok: false, message: "A refund can only be requested on a completed payment." };
  }
  const supabase = await admin();
  await supabase
    .from("payments")
    .update({ status: "refund_requested" })
    .eq("request_id", requestId)
    .eq("status", "payment_received");
  await setRequestPaymentStatus(requestId, "refund_requested");
  return { ok: true };
}

// --------------------------------------------------------------------- admin

export type AdminPaymentRow = PaymentRecord & {
  email: string;
  request_reference: string;
  service_type: string | null;
  destination_country: string | null;
  request_payment_status: PaymentStatus;
};

export async function loadAdminPayments(filters: {
  status?: string | undefined;
  search?: string | undefined;
}): Promise<{ rows: AdminPaymentRow[]; totals: Record<string, number>; revenue: number }> {
  const supabase = await admin();
  let query = supabase
    .from("payment_transactions")
    .select(
      "id, request_id, email, amount, currency, payment_provider, transaction_reference, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (filters.status && filters.status !== "all") {
    // Filter chips speak PAYMENT_STATUSES, the column stores TRANSACTION_STATUSES.
    const wanted = normalizePaymentStatus(filters.status);
    const underlying = TRANSACTION_STATUS_FOR_PAYMENT_STATUS[wanted] ?? [];
    query = query.in("status", underlying.length ? underlying : [filters.status]);
  }

  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`transaction_reference.ilike.${term},email.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[payments] admin list", error.message);
    return { rows: [], totals: {}, revenue: 0 };
  }

  const raw = (data ?? []) as Record<string, unknown>[];
  const requestIds = [...new Set(raw.map((row) => String(row["request_id"])))].filter(Boolean);

  const requestsById = new Map<string, Record<string, unknown>>();
  if (requestIds.length) {
    const { data: requestRows } = await supabase
      .from("service_requests")
      .select("id, request_reference, service_type, destination_country, payment_status")
      .in("id", requestIds);
    (requestRows ?? []).forEach((row) => {
      requestsById.set(String((row as Record<string, unknown>)["id"]), row as Record<string, unknown>);
    });
  }

  const rows: AdminPaymentRow[] = raw.map((row) => {
    const base = shapePayment(row);
    const request = requestsById.get(base.request_id);
    return {
      ...base,
      email: String(row["email"] ?? ""),
      request_reference: String(request?.["request_reference"] ?? ""),
      service_type: (request?.["service_type"] as string | null) ?? null,
      destination_country: (request?.["destination_country"] as string | null) ?? null,
      request_payment_status: normalizePaymentStatus(request?.["payment_status"]),
    };
  });

  const totals: Record<string, number> = {};
  let revenue = 0;
  rows.forEach((row) => {
    totals[row.status] = (totals[row.status] ?? 0) + 1;
    if (row.status === "payment_received") revenue += row.amount ?? 0;
  });

  return { rows, totals, revenue };
}

export async function adminSetPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
): Promise<{ ok: boolean; message?: string; request_id?: string }> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("payments")
    .update({ status })
    .eq("id", paymentId)
    .select("id, request_id, transaction_reference")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? "Payment not found." };
  }
  const row = data as Record<string, unknown>;
  const requestId = String(row["request_id"] ?? "");
  if (requestId) await setRequestPaymentStatus(requestId, status);
  if (requestId && status === "payment_received") {
    const { notifyPaymentReceived } = await import("./notifications.server");
    const { formatMoney } = await import("./payment-status");
    const { data: paid } = await supabase
      .from("payments")
      .select("amount, currency")
      .eq("id", paymentId)
      .maybeSingle();
    const amount = paid ? (paid as Record<string, unknown>)["amount"] : null;
    await notifyPaymentReceived({
      requestId,
      amountLabel: formatMoney(amount === null || amount === undefined ? null : Number(amount), CURRENCY),
      transactionReference: String(row["transaction_reference"] ?? ""),
    });
  }
  return { ok: true, request_id: requestId };
}

export async function adminSetRequestFee(
  requestId: string,
  amount: number,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await admin();
  const { error } = await supabase
    .from("service_requests")
    .update({ agreed_fee: amount })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
