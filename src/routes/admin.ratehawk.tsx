import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkBookingStatusByOrderId,
  runCreditCardTestBooking,
  runRateHawkDiagnostics,
  type RateHawkDiagnostics,
} from "@/lib/travel-api/ratehawk-diagnostics.functions";

export const Route = createFileRoute("/admin/ratehawk")({
  head: () => ({
    meta: [
      { title: "RateHawk Diagnostics | Amazingfly.ng Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRateHawkPage,
});

/** Assemble a single plain-text report of every step for pasting into email. */
function buildLogText(result: RateHawkDiagnostics): string {
  const lines: string[] = [];
  lines.push("RateHawk diagnostics log");
  lines.push(`Environment: ${result.environment}`);
  lines.push(`Through static-IP proxy: ${result.viaProxy ? "yes" : "NO"}`);
  lines.push(`Hotel ID: ${result.hotelId}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  for (const step of result.steps) {
    lines.push("========================================");
    lines.push(`${step.step}`);
    lines.push(`Endpoint: ${step.endpoint}`);
    lines.push(`Result: ${step.ok ? "OK" : "FAILED"} · HTTP ${step.httpStatus} · ${(step.ms / 1000).toFixed(1)}s · ${step.detail}`);
    lines.push("");
    lines.push("--- REQUEST ---");
    lines.push(step.request);
    lines.push("");
    lines.push("--- RESPONSE ---");
    lines.push(step.response);
    lines.push("");
  }
  return lines.join("\n");
}

function AdminRateHawkPage() {
  const run = useServerFn(runRateHawkDiagnostics);
  const runCardTest = useServerFn(runCreditCardTestBooking);
  const [hotelId, setHotelId] = useState("10004834");
  const [includeBookingForm, setIncludeBookingForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const diagnostics = useMutation({
    mutationFn: () => run({ data: { hotelId, includeBookingForm } }),
  });
  const cardTest = useMutation({ mutationFn: () => runCardTest({ data: {} }) });
  const checkStatus = useServerFn(checkBookingStatusByOrderId);
  const [statusOrderId, setStatusOrderId] = useState("");
  const statusCheck = useMutation({
    mutationFn: (partnerOrderId: string) => checkStatus({ data: { partnerOrderId } }),
  });
  const result = diagnostics.data;
  const card = cardTest.data;

  async function copyAll() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildLogText(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AdminShell
      title="RateHawk diagnostics"
      subtitle="Runs hotel page → rate check (and optionally start booking) against RateHawk with the site's own credentials and proxy, and captures the full request/response of each step. Nothing is booked or charged."
    >
      <div className="glass-card space-y-4 rounded-3xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1 text-sm font-semibold text-navy">
            Hotel ID
            <Input value={hotelId} onChange={(event) => setHotelId(event.target.value)} />
          </label>
          <Button
            className="btn-gradient border-0 text-white"
            disabled={diagnostics.isPending}
            onClick={() => diagnostics.mutate()}
          >
            {diagnostics.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Run test
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm text-navy">
          <input
            type="checkbox"
            checked={includeBookingForm}
            onChange={(event) => setIncludeBookingForm(event.target.checked)}
          />
          Also test step 3 (start booking) — opens a booking process at RateHawk; avoid right
          before a real test booking on the same hotel.
        </label>
        <p className="text-xs text-muted-foreground">
          10004834 is RateHawk&apos;s standard sandbox test hotel; 8819557 tests a 10% prebook
          price increase. Tick step 3 to reach the booking/form step where <code>rate_not_found</code>{" "}
          can appear.
        </p>

        {diagnostics.error ? (
          <p className="rounded-xl bg-peach-tint px-3 py-2 text-sm text-navy">
            {diagnostics.error instanceof Error ? diagnostics.error.message : "Test failed."}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-navy">
                Environment: <strong>{result.environment}</strong> · Through static-IP proxy:{" "}
                <strong>{result.viaProxy ? "yes" : "NO"}</strong>
              </p>
              <Button variant="secondary" size="sm" onClick={copyAll}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                {copied ? "Copied!" : "Copy all logs"}
              </Button>
            </div>
            <ul className="space-y-3">
              {result.steps.map((step) => (
                <li key={step.step} className="rounded-2xl bg-white/70 px-4 py-3 text-sm">
                  <div className="flex items-start gap-3">
                    {step.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-navy">{step.step}</p>
                      <p className="text-muted-foreground">
                        {step.endpoint} · HTTP {step.httpStatus} · {(step.ms / 1000).toFixed(1)}s ·{" "}
                        {step.detail}
                      </p>
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-navy">
                      Request &amp; response
                    </summary>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">Request</p>
                    <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-navy/90 p-3 text-xs text-white">
                      {step.request}
                    </pre>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">Response</p>
                    <pre className="mt-1 max-h-96 overflow-auto rounded-lg bg-navy/90 p-3 text-xs text-white">
                      {step.response}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="glass-card mt-6 space-y-4 rounded-3xl p-6">
        <div>
          <p className="font-bold text-navy">Credit-card test booking (demo hotel 8473727)</p>
          <p className="text-xs text-muted-foreground">
            Runs the real credit-card flow end-to-end: search → refundable rate → prebook → Payota
            card token → finish (&quot;now&quot;) → status. This books the demo hotel and charges the
            corporate card a few USD (refundable) — cancel it afterwards. Requires the
            RATEHAWK_CARD_* secrets and a whitelisted return_path.
          </p>
        </div>
        <Button
          className="btn-gradient border-0 text-white"
          disabled={cardTest.isPending}
          onClick={() => cardTest.mutate()}
        >
          {cardTest.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Run credit-card test booking
        </Button>

        {cardTest.error ? (
          <p className="rounded-xl bg-peach-tint px-3 py-2 text-sm text-navy">
            {cardTest.error instanceof Error ? cardTest.error.message : "Test failed."}
          </p>
        ) : null}

        {card ? (
          <div className="space-y-3">
            <p className="text-sm text-navy">
              Environment: <strong>{card.environment}</strong> · Proxy:{" "}
              <strong>{card.viaProxy ? "yes" : "NO"}</strong> · IP RateHawk saw:{" "}
              <strong>{card.egressIpSeenByRateHawk ?? "—"}</strong>
            </p>
            {card.partnerOrderId ? (
              <p className="text-sm text-navy">
                Order: <strong>{card.orderId ?? "—"}</strong> · partner_order_id:{" "}
                <code className="text-xs">{card.partnerOrderId}</code> · final status:{" "}
                <strong>{card.finalStatus ?? "—"}</strong>
              </p>
            ) : null}
            <ul className="space-y-2">
              {card.steps.map((step) => (
                <li key={step.step} className="rounded-2xl bg-white/70 px-4 py-3 text-sm">
                  <div className="flex items-start gap-3">
                    {step.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-navy">{step.step}</p>
                      <p className="break-words text-muted-foreground">{step.detail}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-2 space-y-2 border-t border-navy/10 pt-4">
          <p className="text-sm font-semibold text-navy">Re-check a booking status</p>
          <p className="text-xs text-muted-foreground">
            After a <code>booking_timeout</code>, paste the partner_order_id (or use the last test&apos;s)
            to ask RateHawk for the final status.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={statusOrderId || card?.partnerOrderId || ""}
              onChange={(event) => setStatusOrderId(event.target.value)}
              placeholder="partner_order_id"
            />
            <Button
              variant="secondary"
              disabled={statusCheck.isPending}
              onClick={() => statusCheck.mutate(statusOrderId || card?.partnerOrderId || "")}
            >
              {statusCheck.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Check status
            </Button>
          </div>
          {statusCheck.data ? (
            <div className="text-sm text-navy">
              <p>
                HTTP {statusCheck.data.httpStatus} · status:{" "}
                <strong>{statusCheck.data.status ?? "—"}</strong>
                {statusCheck.data.percent !== null ? ` · ${statusCheck.data.percent}%` : ""}
              </p>
              <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-navy/90 p-3 text-xs text-white">
                {statusCheck.data.response}
              </pre>
            </div>
          ) : null}
          {statusCheck.error ? (
            <p className="rounded-xl bg-peach-tint px-3 py-2 text-sm text-navy">
              {statusCheck.error instanceof Error ? statusCheck.error.message : "Status check failed."}
            </p>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
