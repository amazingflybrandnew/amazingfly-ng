import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runRateHawkDiagnostics } from "@/lib/travel-api/ratehawk-diagnostics.functions";

export const Route = createFileRoute("/admin/ratehawk")({
  head: () => ({
    meta: [
      { title: "RateHawk Diagnostics | Amazingfly.ng Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRateHawkPage,
});

function AdminRateHawkPage() {
  const run = useServerFn(runRateHawkDiagnostics);
  const [hotelId, setHotelId] = useState("10004834");
  const [includeBookingForm, setIncludeBookingForm] = useState(false);
  const diagnostics = useMutation({
    mutationFn: () => run({ data: { hotelId, includeBookingForm } }),
  });
  const result = diagnostics.data;

  return (
    <AdminShell
      title="RateHawk diagnostics"
      subtitle="Runs hotel page → rate check (and optionally start booking) against RateHawk with the site's own credentials and proxy. Nothing is booked or charged."
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
          price increase.
        </p>

        {diagnostics.error ? (
          <p className="rounded-xl bg-peach-tint px-3 py-2 text-sm text-navy">
            {diagnostics.error instanceof Error ? diagnostics.error.message : "Test failed."}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-2">
            <p className="text-sm text-navy">
              Environment: <strong>{result.environment}</strong> · Through static-IP proxy:{" "}
              <strong>{result.viaProxy ? "yes" : "NO"}</strong>
            </p>
            <ul className="space-y-2">
              {result.steps.map((step) => (
                <li
                  key={step.step}
                  className="flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm"
                >
                  {step.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-navy">{step.step}</p>
                    <p className="text-muted-foreground">
                      {(step.ms / 1000).toFixed(1)}s · {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
