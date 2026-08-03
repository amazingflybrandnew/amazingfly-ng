/**
 * Server-only payment helpers for Amazingfly Travels.
 *
 * Every payment row lives in `public.payment_transactions` and always points at
 * an existing `service_requests` row, so flight, hotel, visa and other travel
 * requests share the same flow. No provider (Paystack/Flutterwave) is wired up
 * yet — this file only owns the data layer and reference generation.
 */
import type { SessionUser } from "../auth.server";
import {
  normalizePaymentType,
  normalizeTransactionStatus,
  paymentTypeForService,
  type PaymentProvider,
  type PaymentTransaction,
  type PaymentType,
  type TransactionStatus,
} from "./types";

async function admin() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

const TABLE = "payment_transactions";

/** AFP-YYYYMMDD-XXXXXX — mirrors the AF- request reference format. */
export function buildTransactionReference(): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
    now.getUTCDate(),
  ).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) tail += alphabet[byte % alphabet.length];
  return `AFP-${stamp}-${tail}`;
}

function shape(row: Record<string, unknown>): PaymentTransaction {
  const request = row["service_requests"] as Record<string, unknown> | null | undefined;
  return {
    id: String(row["id"]),
    request_id: row["request_id"] ? String(row["request_id"]) : null,
    request_reference: request?.["request_reference"]
      ? String(request["request_reference"])
      : null,
    transaction_reference: String(row["transaction_reference"] ?? ""),
    provider: (String(row["provider"] ?? "manual") as PaymentProvider) ?? "manual",
    payment_type: normalizePaymentType(row["payment_type"]),
    amount: Number(row["amount"] ?? 0),
    currency: String(row["currency"] ?? "NGN"),
    status: normalizeTransactionStatus(row["status"]),
    payment_method: row["payment_method"] ? String(row["payment_method"]) : null,
    paid_at: row["paid_at"] ? String(row["paid_at"]) : null,
    created_at: String(row["created_at"] ?? ""),
  };
}

const SELECT = "*, service_requests(request_reference, service_type)";

/** Customer view — always scoped to the signed-in user. */
export async function listCustomerTransactions(
  user: SessionUser,
): Promise<PaymentTransaction[]> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[payment] listCustomerTransactions", error.message);
    return [];
  }
  return (data ?? []).map((row) => shape(row as Record<string, unknown>));
}

export async function listRequestTransactions(
  requestId: string,
): Promise<PaymentTransaction[]> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[payment] listRequestTransactions", error.message);
    return [];
  }
  return (data ?? []).map((row) => shape(row as Record<string, unknown>));
}

/** Latest transaction per request — used by the admin request list. */
export async function latestTransactionByRequest(): Promise<Map<string, PaymentTransaction>> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(1000);

  const map = new Map<string, PaymentTransaction>();
  if (error) {
    console.error("[payment] latestTransactionByRequest", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const item = shape(row as Record<string, unknown>);
    if (item.request_id && !map.has(item.request_id)) map.set(item.request_id, item);
  }
  return map;
}

/**
 * Creates a pending transaction against an existing request. Provider
 * checkout is deliberately NOT started here — that arrives in Part 2.
 */
export async function createPendingTransaction(input: {
  user_id: string | null;
  request_id: string;
  amount: number;
  currency?: string;
  provider?: PaymentProvider;
  payment_type?: PaymentType;
  payment_method?: string | null;
}): Promise<{ ok: true; transaction: PaymentTransaction } | { ok: false; message: string }> {
  const supabase = await admin();

  const { data: request } = await supabase
    .from("service_requests")
    .select("id, service_type")
    .eq("id", input.request_id)
    .maybeSingle();

  if (!request) return { ok: false, message: "We could not find that request." };

  const payload = {
    user_id: input.user_id,
    request_id: input.request_id,
    transaction_reference: buildTransactionReference(),
    provider: input.provider ?? "manual",
    payment_type:
      input.payment_type ??
      paymentTypeForService(
        (request as Record<string, unknown>)["service_type"] as string | null,
      ),
    amount: input.amount,
    currency: input.currency ?? "NGN",
    status: "pending" satisfies TransactionStatus,
    payment_method: input.payment_method ?? null,
  };

  const { data, error } = await supabase.from(TABLE).insert(payload).select(SELECT).single();
  if (error || !data) {
    console.error("[payment] createPendingTransaction", error?.message);
    return { ok: false, message: "We could not start this payment. Please try again." };
  }
  return { ok: true, transaction: shape(data as Record<string, unknown>) };
}

/** Moves a transaction to its final state. Server-side callers only. */
export async function setTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  providerResponse?: unknown,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await admin();
  const patch: Record<string, unknown> = { status };
  if (status === "successful") patch["paid_at"] = new Date().toISOString();
  if (providerResponse !== undefined) patch["provider_response"] = providerResponse;

  const { error } = await supabase.from(TABLE).update(patch).eq("id", transactionId);
  if (error) {
    console.error("[payment] setTransactionStatus", error.message);
    return { ok: false, message: "We could not update this payment." };
  }
  return { ok: true };
}
