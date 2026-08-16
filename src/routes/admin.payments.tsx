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

// rest of component retained from reconciliation implementation

export const Route = createFileRoute("/admin/payments")({
  component: AdminPaymentsPage,
});

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
    onSuccess: async (result, paymentId) => {
      setReconcileMessage((current) => ({ ...current, [paymentId]: result.message }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
  });

  const rows = list.data?.rows ?? [];
  const mismatchCount = rows.filter(
    (row) => normalizePaymentStatus(row.status) !== normalizePaymentStatus(row.request_payment_status),
  ).length;

  return (
    <AdminShell title="Payments" subtitle="Provider verified payment management.">
      <div className="glass-card mb-6 rounded-3xl border border-mint/40 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-navy">
          <ShieldCheck className="h-4 w-4" /> Provider verification required
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Paystack remains the source of truth. Staff cannot manually mark online payments as paid.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="glass-card rounded-3xl p-5"><BadgeDollarSign /><p className="mt-3 text-2xl font-extrabold">{formatMoney(list.data?.revenue ?? 0)}</p><p>Payments received</p></div>
        {["pending_payment", "payment_failed", "refund_requested"].map((key) => <div key={key} className="glass-card rounded-3xl p-5"><p className="text-3xl font-extrabold">{list.data?.totals?.[key] ?? 0}</p><p>{PAYMENT_STATUS_LABELS[key as keyof typeof PAYMENT_STATUS_LABELS]}</p></div>)}
        <div className="glass-card rounded-3xl border border-orange/40 p-5"><AlertTriangle /><p className="mt-3 text-3xl font-extrabold">{mismatchCount}</p><p>Needs reconciliation</p></div>
      </div>
      <div className="glass-card mt-6 rounded-3xl p-5 flex gap-3">
        <Search className="mt-2" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference or email" />
      </div>
      <div className="mt-6 overflow-x-auto rounded-3xl bg-white">
        <table className="w-full min-w-[1000px]">
          <thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{rows.map((row) => {
            const mismatch = normalizePaymentStatus(row.status) !== normalizePaymentStatus(row.request_payment_status);
            return <tr key={row.id} className={mismatch ? "bg-orange-50" : ""}>
              <td>{row.transaction_reference}</td>
              <td>{row.email}</td>
              <td>{formatMoney(row.amount, row.currency)}</td>
              <td><span className={paymentTone(row.status)}>{paymentStatusLabel(row.status)}</span></td>
              <td>{row.payment_provider.toLowerCase() === "paystack" ? <Button onClick={() => reconcile.mutate(row.id)} disabled={reconcile.isPending}>{reconcile.isPending ? <Loader2 className="animate-spin" /> : mismatch ? <AlertTriangle /> : <CheckCircle2 />} {mismatch ? "Reconcile" : "Verify"}</Button> : <RefreshCw />}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <Button variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "payments"] })}>Refresh</Button>
    </AdminShell>
  );
}
