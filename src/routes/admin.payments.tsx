import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAdminPayments, reconcileAdminPayment } from "@/lib/payments.functions";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  formatMoney,
  normalizePaymentStatus,
  paymentStatusLabel,
  paymentTone,
} from "@/lib/payment-status";
import { formatDate } from "@/lib/request-status";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payment Management | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Authorised staff view of Amazingfly Travels payments: paid, pending, failed and refunded transactions with references.",
      },
      { property: "og:title", content: "Payment Management | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "Track every transaction reference and payment status in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPaymentsPage,
});

const FILTERS = [
  { value: "all", label: "All payments" },
  ...PAYMENT_STATUSES.map((status) => ({ value: status, label: PAYMENT_STATUS_LABELS[status]! })),
];

function AdminPaymentsPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [reconcileMessage, setReconcileMessage] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const fetchPayments = useServerFn(getAdminPayments);
  const reconcilePayment = useServerFn(reconcileAdminPayment);

  const list = useQuery({
    queryKey: ["admin", "payments", status, search],
    queryFn: () => fetchPayments({ data: { status, search } }),
  });

  const reconcile = useMutation({
    mutationFn: (paymentId: string) => reconcilePayment({ data: { payment_id: paymentId } }),
    onMutate: (paymentId) => {
      setReconcileMessage((current) => ({ ...current, [paymentId]: "" }));
    },
    onSuccess: async (result, paymentId) => {
      setReconcileMessage((current) => ({
        ...current,
        [paymentId]: result.message,
      }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
    onError: (_error, paymentId) => {
      setReconcileMessage((current) => ({
        ...current,
        [paymentId]: "We could not reconcile this payment. Please try again.",
      }));
    },
  });

  const rows = list.data?.rows ?? [];
  const totals = list.data?.totals ?? {};
  const mismatchCount = rows.filter((row) => {
    if (!row.request_id) return false;
    return normalizePaymentStatus(row.status) !== normalizePaymentStatus(row.request_payment_status);
  }).length;

  return (
    <AdminShell
      title="Payments"
      subtitle="Every transaction raised on Amazingfly.ng, with its reference, provider and current state."
    >
      <div className="glass-card mb-6 rounded-3xl border border-mint/40 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-navy">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Online payment status is provider-verified
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff cannot manually mark a Paystack transaction as paid. Use Verify with Paystack to
          reconcile the transaction reference against Paystack before Amazingfly updates the
          request or sends a payment confirmation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="glass-card rounded-3xl p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-tint">
            <BadgeDollarSign className="h-5 w-5 text-navy" aria-hidden="true" />
          </span>
          <p className="mt-4 text-2xl font-extrabold text-navy">
            {formatMoney(list.data?.revenue ?? 0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Payments received</p>
        </div>
        {(["pending_payment", "payment_failed", "refund_requested"] as const).map((key) => (
          <div key={key} className="glass-card rounded-3xl p-5">
            <p className="text-3xl font-extrabold text-navy">{totals[key] ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">{PAYMENT_STATUS_LABELS[key]}</p>
          </div>
        ))}
        <div className="glass-card rounded-3xl border border-orange/40 p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-peach-tint">
            <AlertTriangle className="h-5 w-5 text-navy" aria-hidden="true" />
          </span>
          <p className="mt-4 text-3xl font-extrabold text-navy">{mismatchCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">Visible mismatches</p>
        </div>
      </div>

      <div className="glass-card mt-6 flex flex-wrap items-center gap-3 rounded-3xl p-5">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-soft"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reference or email"
            aria-label="Search payments"
            className="rounded-2xl border-white/60 bg-white/80 pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                status === filter.value
                  ? "border-transparent bg-navy text-white"
                  : "border-white/60 bg-white/70 text-navy-soft hover:text-navy"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {list.isPending ? (
        <div className="glass-card mt-6 flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card mt-6 rounded-3xl p-10 text-center text-sm text-muted-foreground">
          No payments match this filter yet.
        </div>
      ) : (
        <div className="glass-card mt-6 overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-white/70 text-[11px] uppercase tracking-[0.14em] text-navy-soft">
                  <th className="px-5 py-3 font-bold">Reference</th>
                  <th className="px-5 py-3 font-bold">Request</th>
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold">Amount</th>
                  <th className="px-5 py-3 font-bold">Provider</th>
                  <th className="px-5 py-3 font-bold">Transaction status</th>
                  <th className="px-5 py-3 font-bold">Request status</th>
                  <th className="px-5 py-3 font-bold">Reconcile</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isPaystack = row.payment_provider.toLowerCase() === "paystack";
                  const providerStatus = normalizePaymentStatus(row.status);
                  const requestStatus = normalizePaymentStatus(row.request_payment_status);
                  const isSuccessful = providerStatus === "payment_received";
                  const needsReconciliation =
                    Boolean(row.request_id) && providerStatus !== requestStatus;
                  const isCurrent = reconcile.isPending && reconcile.variables === row.id;
                  const resultMessage = reconcileMessage[row.id];

                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-white/60 align-top ${
                        needsReconciliation ? "bg-peach-tint/40" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <p className="break-all font-semibold text-navy">
                          {row.transaction_reference}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {formatDate(row.created_at)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {row.request_id ? (
                          <Link
                            to="/admin/requests/$id"
                            params={{ id: row.request_id }}
                            className="font-semibold text-navy hover:text-navy-soft"
                          >
                            {row.request_reference || "Open request"}
                          </Link>
                        ) : (
                          <p className="font-semibold text-navy">{row.request_reference || "—"}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.service_type ?? "—"}
                          {row.destination_country ? ` · ${row.destination_country}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{row.email}</td>
                      <td className="px-5 py-4 font-semibold text-navy">
                        {formatMoney(row.amount, row.currency)}
                      </td>
                      <td className="px-5 py-4 capitalize text-muted-foreground">
                        {row.payment_provider}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${paymentTone(
                            providerStatus,
                          )}`}
                        >
                          {paymentStatusLabel(providerStatus)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {row.request_id ? (
                          <>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${paymentTone(
                                requestStatus,
                              )}`}
                            >
                              {paymentStatusLabel(requestStatus)}
                            </span>
                            {needsReconciliation ? (
                              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-navy">
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                Needs reconciliation
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No linked request</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isPaystack ? (
                          <div className="min-w-[190px]">
                            <Button
                              type="button"
                              variant={needsReconciliation || !isSuccessful ? "default" : "ghost"}
                              size="sm"
                              disabled={isCurrent}
                              onClick={() => reconcile.mutate(row.id)}
                            >
                              {isCurrent ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : needsReconciliation ? (
                                <AlertTriangle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                              ) : isSuccessful ? (
                                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                              ) : (
                                <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                              )}
                              {needsReconciliation
                                ? "Reconcile mismatch"
                                : isSuccessful
                                  ? "Re-check Paystack"
                                  : "Verify with Paystack"}
                            </Button>
                            {resultMessage ? (
                              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                {resultMessage}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="max-w-[210px] text-xs leading-relaxed text-muted-foreground">
                            {needsReconciliation
                              ? "Transaction and request statuses differ. This provider requires manual provider review."
                              : "Automatic reconciliation is only available for Paystack transactions."}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Customer checkout amounts are created by the live service payment flow. For Paystack
        transactions, use provider verification rather than manually changing a payment status.
        Visible mismatches are linked requests whose transaction status differs from the request
        payment status in the current filtered view.
      </p>
      <Button
        variant="ghost"
        className="mt-2 text-navy-soft"
        onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "payments"] })}
      >
        Refresh
      </Button>
    </AdminShell>
  );
}
