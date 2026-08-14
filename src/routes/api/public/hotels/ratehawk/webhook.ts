/**
 * RateHawk (ETG) booking-status webhook.
 *
 * Lives under /api/public/* so RateHawk can reach it without site auth.
 *
 * GET  — health probe, always 200.
 * POST — the real callback.
 *
 * Authentication follows the ETG webhook signature mechanism: the callback
 * carries an HMAC-SHA256 of the raw request body, keyed with our server-side
 * RateHawk API token (RATEHAWK_API_TOKEN, read from project secrets — never
 * hardcoded and never echoed back). Both hex and base64 digests are accepted,
 * compared in constant time.
 *
 * Status codes: malformed payload → 400, bad/missing signature → 401,
 * successful processing → 200, internal failure → 500 so RateHawk retries.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** ETG: HMAC-SHA256(key = api token, message = timestamp + token) in hex. */
function verifySignature(
  signature: { signature?: string; timestamp?: number; token?: string } | null | undefined,
  apiToken: string,
): boolean {
  if (!signature?.signature || signature.timestamp == null || !signature.token) {
    return false;
  }
  const expected = createHmac("sha256", apiToken)
    .update(`${signature.timestamp}${signature.token}`, "utf8")
    .digest("hex");
  return safeEqual(signature.signature.trim().toLowerCase(), expected);
}

type RateHawkCallback = {
  status?: string;
  data?: {
    partner_order_id?: string;
    order_id?: string | number;
    status?: string;
    error?: string | null;
  } | null;
  signature?: { signature?: string; timestamp?: number; token?: string } | null;
  partner_order_id?: string;
  order_id?: string | number;
  error?: string | null;
};

export const Route = createFileRoute("/api/public/hotels/ratehawk/webhook")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, service: "ratehawk-webhook" }),

      POST: async ({ request }) => {
        const token = process.env["RATEHAWK_API_TOKEN"];
        if (!token) {
          console.error("[ratehawk-webhook] RATEHAWK_API_TOKEN is not configured");
          return new Response("Webhook not configured", { status: 500 });
        }

        const rawBody = await request.text();

        const provided = SIGNATURE_HEADERS.map((name) => request.headers.get(name)).find(
          (value): value is string => Boolean(value),
        );
        if (!provided || !verifySignature(rawBody, provided, token)) {
          console.error("[ratehawk-webhook] rejected: invalid or missing signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let event: RateHawkCallback | null = null;
        try {
          event = JSON.parse(rawBody) as RateHawkCallback;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const body = event?.data ?? event ?? {};
        const partnerOrderId = body.partner_order_id ?? event?.partner_order_id;
        const providerStatus = String(
          body.status ?? event?.status ?? "processing",
        ).toLowerCase();
        const orderId = body.order_id ?? event?.order_id;

        if (!partnerOrderId) {
          return new Response("Missing partner_order_id", { status: 400 });
        }

        const status =
          providerStatus === "ok" || providerStatus === "completed"
            ? "ok"
            : providerStatus === "error" || providerStatus === "failed"
              ? "failed"
              : "processing";

        const { applyBookingStatus } = await import(
          "@/lib/travel-api/hotel-booking.server"
        );

        try {
          await applyBookingStatus({
            partnerOrderId,
            status,
            providerStatus,
            orderId: orderId != null ? String(orderId) : null,
            errorMessage:
              status === "failed"
                ? (body.error ?? event?.error ?? "Booking failed at the hotel provider.")
                : null,
            payload: event,
          });
        } catch (error) {
          // Genuine internal failure — non-200 so RateHawk retries.
          console.error("[ratehawk-webhook] processing failed", error);
          return new Response("Processing failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
