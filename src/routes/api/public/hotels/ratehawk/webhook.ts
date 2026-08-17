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
 * Every POST leaves a minimal ingress diagnostic containing only arrival /
 * parsing / signature-result metadata and provider order identifiers when
 * present. It never stores the signature value, API token, raw payload, card
 * data or customer PII. Signature-verified callbacks are separately written to
 * ratehawk_webhook_events for certification evidence.
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
        const { createExternalSupabaseAdmin } = await import(
          "@/lib/external-supabase.server"
        );
        const db = createExternalSupabaseAdmin();
        const rawBody = await request.text();

        let event: RateHawkCallback | null = null;
        try {
          event = JSON.parse(rawBody) as RateHawkCallback;
        } catch {
          const { error: ingressError } = await db.from("ratehawk_webhook_ingress").insert({
            method: request.method,
            payload_parseable: false,
            signature_present: false,
            signature_verified: null,
            partner_order_id: null,
            order_id: null,
            outcome: "invalid_payload",
          });
          if (ingressError) {
            console.error("[ratehawk-webhook] ingress diagnostic failed", ingressError.message);
          }
          return new Response("Invalid payload", { status: 400 });
        }

        const body = event?.data ?? event ?? {};
        const partnerOrderId = body.partner_order_id ?? event?.partner_order_id;
        const orderId = body.order_id ?? event?.order_id;
        const signaturePresent = Boolean(
          event?.signature?.signature &&
            event.signature.timestamp != null &&
            event.signature.token,
        );
        const token = process.env["RATEHAWK_API_TOKEN"];
        const signatureVerified = token ? verifySignature(event?.signature, token) : null;
        const ingressOutcome = !token
          ? "webhook_not_configured"
          : !signatureVerified
            ? "invalid_signature"
            : !partnerOrderId
              ? "missing_partner_order_id"
              : "signature_verified";

        const { data: ingressRow, error: ingressError } = await db
          .from("ratehawk_webhook_ingress")
          .insert({
            method: request.method,
            payload_parseable: true,
            signature_present: signaturePresent,
            signature_verified: signatureVerified,
            partner_order_id: partnerOrderId ?? null,
            order_id: orderId != null ? String(orderId) : null,
            outcome: ingressOutcome,
          })
          .select("id")
          .maybeSingle();
        if (ingressError) {
          console.error("[ratehawk-webhook] ingress diagnostic failed", ingressError.message);
        }
        const ingressId = (ingressRow as { id?: string } | null)?.id ?? null;

        if (!token) {
          console.error("[ratehawk-webhook] RATEHAWK_API_TOKEN is not configured");
          return new Response("Webhook not configured", { status: 500 });
        }

        if (!signatureVerified) {
          console.error("[ratehawk-webhook] rejected: invalid or missing signature");
          return new Response("Invalid signature", { status: 401 });
        }

        if (!partnerOrderId) {
          return new Response("Missing partner_order_id", { status: 400 });
        }

        const providerStatus = String(
          body.status ?? event?.status ?? "processing",
        ).toLowerCase();
        const status = mappedBookingStatus(providerStatus);

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
          if (ingressId) {
            await db
              .from("ratehawk_webhook_ingress")
              .update({ outcome: "audit_failed" })
              .eq("id", ingressId);
          }
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
            if (ingressId) {
              await db
                .from("ratehawk_webhook_ingress")
                .update({ outcome: "audit_completion_failed" })
                .eq("id", ingressId);
            }
            return new Response("Processing failed", { status: 500 });
          }

          if (ingressId) {
            const { error: ingressUpdateError } = await db
              .from("ratehawk_webhook_ingress")
              .update({ outcome: "processed" })
              .eq("id", ingressId);
            if (ingressUpdateError) {
              console.error(
                "[ratehawk-webhook] ingress completion failed",
                ingressUpdateError.message,
              );
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Webhook processing failed";
          await db
            .from("ratehawk_webhook_events")
            .update({ processed: false, processing_error: message.slice(0, 1000) })
            .eq("id", auditId);
          if (ingressId) {
            await db
              .from("ratehawk_webhook_ingress")
              .update({ outcome: "processing_failed" })
              .eq("id", ingressId);
          }

          // Genuine internal failure — non-200 so RateHawk retries.
          console.error("[ratehawk-webhook] processing failed", error);
          return new Response("Processing failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
