/**
 * Server-only Paystack integration for Amazingfly Travels.
 *
 * Stage 3A: initialization ONLY. Nothing here verifies a payment or marks a
 * transaction successful — that arrives in the verification stage.
 *
 * PAYSTACK_SECRET_KEY never leaves the server.
 */
import { getRequestUrl } from "@tanstack/react-start/server";

import type { SessionUser } from "../auth.server";
import type { PaymentTransaction } from "./types";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/** Paystack charges in the smallest currency unit (kobo/cents). */
const ZERO_DECIMAL: readonly string[] = [];

export type PaystackInitResult =
  | { ok: true; authorizationUrl: string; accessCode: string; reference: string }
  | { ok: false; message: string };

export type InitializePaystackInput = {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

function toSubunits(amount: number, currency: string): number {
  const factor = ZERO_DECIMAL.includes(currency.toUpperCase()) ? 1 : 100;
  return Math.round(amount * factor);
}

/** Absolute callback URL on this site, derived from the incoming request. */
export function buildCallbackUrl(requestId: string): string {
  const configured = process.env["PAYSTACK_CALLBACK_BASE_URL"];
  const base = configured && configured.trim() ? configured.trim() : getRequestUrl().origin;
  return `${base.replace(/\/$/, "")}/checkout/${requestId}`;
}

/** Calls the Paystack "initialize transaction" endpoint. */
export async function initializePaystackTransaction(
  input: InitializePaystackInput,
): Promise<PaystackInitResult> {
  const secret = process.env["PAYSTACK_SECRET_KEY"];
  if (!secret) {
    console.error("[paystack] PAYSTACK_SECRET_KEY is not configured");
    return { ok: false, message: "Online payment is not available yet. Please contact support." };
  }

  if (!input.email) return { ok: false, message: "We need an email address to start payment." };
  if (!(input.amount > 0)) {
    return { ok: false, message: "This booking has no amount payable yet." };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: toSubunits(input.amount, input.currency),
        currency: input.currency.toUpperCase(),
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata ?? {},
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          status?: boolean;
          message?: string;
          data?: { authorization_url?: string; access_code?: string; reference?: string };
        }
      | null;

    if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
      console.error("[paystack] initialize failed", response.status, payload?.message);
      return {
        ok: false,
        message: "We could not start the secure payment. Please try again in a moment.",
      };
    }

    return {
      ok: true,
      authorizationUrl: payload.data.authorization_url,
      accessCode: String(payload.data.access_code ?? ""),
      reference: String(payload.data.reference ?? input.reference),
    };
  } catch (error) {
    console.error("[paystack] initialize error", error);
    return { ok: false, message: "We could not reach the payment provider. Please try again." };
  }
}

/**
 * Ownership-checked initialization for a request the customer owns.
 * Keeps the transaction `pending` and only records the Paystack handshake.
 */
export async function startPaystackCheckout(
  user: SessionUser,
  requestId: string,
): Promise<{ ok: true; authorizationUrl: string; transaction: PaymentTransaction } | { ok: false; message: string }> {
  const { prepareCheckout } = await import("./checkout.server");
  const prepared = await prepareCheckout(user, requestId);
  if (!prepared.ok) return prepared;

  const { review, transaction } = prepared;

  if (transaction.status !== "pending") {
    return { ok: false, message: "This payment has already been processed." };
  }

  const init = await initializePaystackTransaction({
    email: user.email,
    amount: transaction.amount,
    currency: transaction.currency,
    reference: transaction.transaction_reference,
    callbackUrl: buildCallbackUrl(requestId),
    metadata: {
      request_id: requestId,
      request_reference: review.reference,
      payment_type: transaction.payment_type,
      service_type: review.serviceType,
      customer_name: user.full_name,
    },
  });

  if (!init.ok) return init;

  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  const supabase = createExternalSupabaseAdmin();

  const { error } = await supabase
    .from("payment_transactions")
    .update({
      provider: "paystack",
      status: "pending",
      provider_response: {
        stage: "initialized",
        access_code: init.accessCode,
        paystack_reference: init.reference,
        authorization_url: init.authorizationUrl,
        initialized_at: new Date().toISOString(),
      },
    })
    .eq("id", transaction.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[paystack] failed to save initialization", error.message);
    return { ok: false, message: "We could not save your payment details. Please try again." };
  }

  return {
    ok: true,
    authorizationUrl: init.authorizationUrl,
    transaction: { ...transaction, provider: "paystack" },
  };
}
