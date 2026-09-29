import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { runInsuranceDiagnostics } from "@/lib/insurance/insurance-diagnostics.functions";
import { ALLIANZ_COUNTRIES } from "@/lib/insurance/allianz-countries";
import { formatMoney } from "@/lib/payment-status";

export const Route = createFileRoute("/admin/insurance")({
  head: () => ({
    meta: [
      { title: "Insurance Diagnostics | Amazingfly.ng Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminInsurancePage,
});

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-sky";

function AdminInsurancePage() {
  const run = useServerFn(runInsuranceDiagnostics);
  const [countryId, setCountryId] = useState("2");
  const diagnostics = useMutation({
    mutationFn: () => run({ data: { countryId: Number(countryId) || 2 } }),
  });
  const result = diagnostics.data;

  return (
    <AdminShell
      title="Insurance diagnostics"
      subtitle="Logs in to Sanlam Allianz with the site's own credentials, loads lookups + travel plans, and runs one live quote (price only). Nothing is booked or charged."
    >
      <div className="glass-card space-y-4 rounded-3xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1 text-sm font-semibold text-navy">
            Sample destination
            <select
              className={selectClass}
              value={countryId}
              onChange={(event) => setCountryId(event.target.value)}
            >
              {ALLIANZ_COUNTRIES.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
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
        <p className="text-xs text-muted-foreground">
          Runs a live quote for a 10-day individual trip. A quote returns a price only — it never
          creates a policy or charges money.
        </p>

        {diagnostics.error ? (
          <p className="rounded-xl bg-peach-tint px-3 py-2 text-sm text-navy">
            {diagnostics.error instanceof Error ? diagnostics.error.message : "Test failed."}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-navy">
              Environment: <strong>{result.environment}</strong> · Base URL set:{" "}
              <strong>{result.baseUrlConfigured ? "yes" : "NO"}</strong> · Credentials:{" "}
              <strong>{result.credentialsPresent ? "present" : "MISSING"}</strong>
            </p>
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
                        {(step.ms / 1000).toFixed(1)}s · {step.detail}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {result.premium ? (
              <div className="rounded-2xl border border-orange/30 bg-orange-tint p-4">
                <p className="text-sm font-medium text-navy">
                  Live Sanlam Allianz net premium (sample trip)
                </p>
                <p className="mt-1 text-2xl font-extrabold text-navy">
                  {formatMoney(result.premium.amount, result.premium.currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This is the raw insurer price (before the Amazingfly markup shown to customers). If
                  this looks right, production is working.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
