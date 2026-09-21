import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/payment-status";
import {
  getInsuranceCertificate,
  getMyInsurancePolicies,
} from "@/lib/insurance/insurance.functions";

/** Lists the customer's issued travel insurance policies with a PDF download. */
export function InsurancePolicies() {
  const listFn = useServerFn(getMyInsurancePolicies);
  const certFn = useServerFn(getInsuranceCertificate);

  const policies = useQuery({
    queryKey: ["my-insurance-policies"],
    queryFn: () => listFn(),
  });

  const download = useMutation({
    mutationFn: (policyId: string) => certFn({ data: { policyId } }),
    onSuccess: (res) => {
      if (!res.ok) return;
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  const rows = policies.data ?? [];
  if (policies.isPending || rows.length === 0) return null;

  return (
    <section className="glass-card rounded-3xl p-6 md:p-8">
      <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        Travel insurance policies
      </h2>
      <div className="mt-5 space-y-3">
        {rows.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/70 p-4"
          >
            <div>
              <p className="text-sm font-bold text-navy">{p.contractNumber || "Travel insurance"}</p>
              <p className="text-xs text-muted-foreground">
                {p.destination ?? "Travel insurance"}
                {p.coverBegins ? ` · ${p.coverBegins} to ${p.coverEnds ?? ""}` : ""} ·{" "}
                {formatMoney(p.amountPaid, p.currency)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={download.isPending}
              onClick={() => download.mutate(p.id)}
            >
              {download.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Certificate
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
