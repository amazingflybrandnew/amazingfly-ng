/**
 * Server-rendered 3-D Secure launcher for the credit-card ("now") booking flow.
 *
 * GET /api/public/hotels/ratehawk/start-3ds?order=<partner_order_id>
 *
 * Re-fetches the booking's current status server-side (so the challenge is
 * always fresh), extracts the ETG data_3ds block, and returns a tiny HTML page
 * that auto-submits the bank challenge form (MD / PaReq / TermUrl) to the ACS
 * action_url. Building the form on the server with proper HTML escaping avoids
 * the browser/caching quirks of client-side form construction (which left
 * TermUrl blank). The data_3ds values are single-use 3-D Secure tokens, not card
 * data; the order id is an unguessable UUID.
 */
import { createFileRoute } from "@tanstack/react-router";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function htmlPage(body: string, status = 200): Response {
  return new Response(`<!doctype html><html><head><meta charset="utf-8" /><title>Card verification</title></head><body style="font-family:system-ui,sans-serif;padding:24px;color:#13233f">${body}</body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/public/hotels/ratehawk/start-3ds")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const order = (new URL(request.url).searchParams.get("order") || "").trim();
        if (!order) return htmlPage("<p>Missing order reference.</p>", 400);

        const { ratehawkExchange } = await import("@/lib/ratehawk.server");
        let exchange;
        try {
          exchange = await ratehawkExchange(
            "/api/b2b/v3/hotel/order/booking/finish/status/",
            { partner_order_id: order },
          );
        } catch {
          return htmlPage("<p>Could not reach the payment provider. Please close this tab and click “Complete 3-D Secure” again.</p>");
        }

        const root = asRecord(exchange.responseJson);
        const status = root?.["status"];
        const data3ds = asRecord(asRecord(root?.["data"])?.["data_3ds"]);
        const actionUrl = data3ds?.["action_url"];
        const fields = asRecord(data3ds?.["data"]);

        if (typeof actionUrl !== "string" || !fields) {
          return htmlPage(
            `<h2>No card verification pending</h2><p>This booking's status is <b>${esc(status)}</b>. It may already be verified, or the 3-D Secure challenge expired. Go back and run a fresh test, then click “Complete 3-D Secure” promptly.</p>`,
          );
        }

        const inputs = Object.entries(fields)
          .filter(([, value]) => typeof value === "string")
          .map(([name, value]) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}" />`)
          .join("");

        return htmlPage(
          `<p>Opening your bank's secure verification page…</p>` +
            `<form id="tds" method="${esc(typeof data3ds["method"] === "string" ? data3ds["method"] : "post")}" action="${esc(actionUrl)}">${inputs}</form>` +
            `<script>document.getElementById("tds").submit();</script>` +
            `<noscript><p>Please enable JavaScript, or <button form="tds">continue</button>.</p></noscript>`,
        );
      },
    },
  },
});
