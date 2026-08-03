/**
 * Paystack webhook endpoint (structure ready for production events).
 *
 * Lives under /api/public/* so Paystack can reach it without site auth.
 * Every delivery is authenticated with the HMAC-SHA512 signature Paystack
 * sends in `x-paystack-signature`, computed over the RAW request body with
 * PAYSTACK_SECRET_KEY. Callback verification is NOT replaced — this is a
 * second, redundant path that reuses the same idempotent finaliser.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function validSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const sig = Buffer.from(signature);
  const exp = Buffer.from(expected);
  return sig.length === exp.length && timingSafeEqual(sig, exp);
}

export const Route = createFileRoute("/api/public/payments/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const rawBody = await request.text();
        if (!validSignature(rawBody, request.headers.get("x-paystack-signature"), secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: { event?: string; data?: { reference?: string } } | null = null;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const reference = event?.data?.reference;
        const name = event?.event ?? "";

        if (reference && (name === "charge.success" || name.startsWith("charge."))) {
          const { finalizePaystackPayment } = await import("@/lib/payment/verify.server");
          const result = await finalizePaystackPayment({ reference });
          if (!result.ok) console.error("[paystack-webhook]", name, result.message);
        }

        // Always 200 so Paystack does not retry events we intentionally skip.
        return new Response("ok", { status: 200 });
      },
    },
  },
});
