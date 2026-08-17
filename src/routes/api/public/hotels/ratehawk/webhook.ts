/**
 * RateHawk (ETG) booking-status webhook.
 *
 * Lives under /api/public/* so RateHawk can reach it without site auth.
 *
 * GET  — health probe, always 200.
 * POST — the real callback.
 *
 * Authentication follows the ETG webhook signature mechanism: the callback
 * carries an HMAC-SHA256 signature keyed with our server-side RateHawk API
 * token (RATEHAWK_API_TOKEN, read from project secrets — never hardcoded and
 * never echoed back).
 *
 * Every signature-verified callback is written to ratehawk_webhook_events so
 * sandbox certification can prove delivery independently of polling.
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

function mappedBookingStatus(providerStatus: string): "ok" | "failed" | "processing" {
  if (providerStatus === "ok" || providerStatus === "completed") return "ok";
  if (
    ["processing", "unknown", "timeout", "started", "created", "pending"].includes(
      providerStatus,
    )
  ) {
    return "processing";
  }
  return "failed";
}

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

        let event: RateHawkCallback | null = null;
        try {
          event = JSON.parse(rawBody) as RateHawkCallback;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        if (!verifySignature(event?.signature, token)) {
          console.error("[ratehawk-webhook] rejected: invalid or missing signature");
          return new Response("Invalid signature", { status: 401 });
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

        const status = mappedBookingStatus(providerStatus);

        const { createExternalSupabaseAdmin } = await import(
          "@/lib/external-supabase.server"
        );
        const db = createExternalSupabaseAdmin();

        const { data: auditRow, error: auditError } = await db
          .from("ratehawk_webhook_events")
          .insert({
            partner_order_id: partnerOrderId,
            order_id: orderId != null ? String(orderId) : null,
            provider_status: providerStatus,
            signature_verified: true,
            processed: false,
          })
          .select("id")
          .single();

        if (auditError || !auditRow) {
          console.error(
            "[ratehawk-webhook] audit receipt failed",
            auditError?.message ?? "missing audit row",
          );
          return new Response("Processing failed", { status: 500 });
        }

        const auditId = String((auditRow as { id: string }).id);

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

          const { error: processedError } = await db
            .from("ratehawk_webhook_events")
            .update({ processed: true, processing_error: null })
            .eq("id", auditId);
          if (processedError) {
            console.error("[ratehawk-webhook] audit completion failed", processedError.message);
            return new Response("Processing failed", { status: 500 });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Webhook processing failed";
          await db
            .from("ratehawk_webhook_events")
            .update({ processed: false, processing_error: message.slice(0, 1000) })
            .eq("id", auditId);

          // Genuine internal failure — non-200 so RateHawk retries.
          console.error("[ratehawk-webhook] processing failed", error);
          return new Response("Processing failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
