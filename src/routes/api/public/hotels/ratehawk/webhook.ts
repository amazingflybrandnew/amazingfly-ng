/**
 * RateHawk booking-status webhook.
 *
 * Lives under /api/public/* so RateHawk can reach it without site auth.
 * Mirrors the Paystack webhook pattern: verify the caller, parse the payload,
 * hand off to the same idempotent finaliser the polling path uses.
 *
 * Authentication: if RATEHAWK_WEBHOOK_SECRET is set, the request must present
 * it as `x-ratehawk-token` (or `?token=`); RateHawk does not sign payloads.
 * The partner_order_id itself is an unguessable UUID and must already exist.
 */
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function tokenMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type RateHawkCallback = {
  status?: string;
  data?: {
    partner_order_id?: string;
    order_id?: string | number;
    status?: string;
    error?: string | null;
  } | null;
  partner_order_id?: string;
  order_id?: string | number;
  error?: string | null;
};

export const Route = createFileRoute("/api/public/hotels/ratehawk/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RATEHAWK_WEBHOOK_SECRET"];
        if (secret) {
          const url = new URL(request.url);
          const provided =
            request.headers.get("x-ratehawk-token") ?? url.searchParams.get("token");
          if (!tokenMatches(provided, secret)) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const rawBody = await request.text();
        let event: RateHawkCallback | null = null;
        try {
          event = JSON.parse(rawBody);
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
          console.error("[ratehawk-webhook]", error);
        }

        // Always 200 so RateHawk does not retry events we intentionally skip.
        return new Response("ok", { status: 200 });
      },
    },
  },
});
