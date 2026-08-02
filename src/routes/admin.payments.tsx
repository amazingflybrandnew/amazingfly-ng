import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeDollarSign, Loader2, Search } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAdminPayments, setAdminPaymentStatus } from "@/lib/payments.functions";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  formatMoney,
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
  const queryClient = useQueryClient();

  const fetchPayments = useServerFn(getAdminPayments);
  const updateStatus = useServerFn(setAdminPaymentStatus);

  const list = useQuery({
    queryKey: ["admin", "payments", status, search],
    queryFn: () => fetchPayments({ data: { status, search } }),
  });

  const change = useMutation({
    mutationFn: (input: { payment_id: string; status: (typeof PAYMENT_STATUSES)[number] }) =>
      updateStatus({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "payments"] }),
  });

  const rows = list.data?.rows ?? [];
  const totals = list.data?.totals ?? {};

  return (
    <AdminShell
      title="Payments"
      subtitle="Every transaction raised on Amazingfly.ng, with its reference, provider and current state."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-white/70 text-[11px] uppercase tracking-[0.14em] text-navy-soft">
                  <th className="px-5 py-3 font-bold">Reference</th>
                  <th className="px-5 py-3 font-bold">Request</th>
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold">Amount</th>
                  <th className="px-5 py-3 font-bold">Provider</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Update</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/60 align-top">
                    <td className="px-5 py-4">
                      <p className="break-all font-semibold text-navy">
                        {row.transaction_reference}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(row.created_at)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-navy">{row.request_reference || "—"}</p>
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
                          row.status,
                        )}`}
                      >
                        {paymentStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={row.status}
                        disabled={change.isPending}
                        onChange={(event) =>
                          change.mutate({
                            payment_id: row.id,
                            status: event.target.value as (typeof PAYMENT_STATUSES)[number],
                          })
                        }
                        aria-label={`Update status for ${row.transaction_reference}`}
                        className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-xs font-semibold text-navy"
                      >
                        {PAYMENT_STATUSES.map((option) => (
                          <option key={option} value={option}>
                            {PAYMENT_STATUS_LABELS[option]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Amount payable comes from the <strong>agreed fee</strong> on each request — set it on the
        request detail page before asking a customer to pay.
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
