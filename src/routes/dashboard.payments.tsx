import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2, ReceiptText, ShieldCheck } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { getMyPaymentTransactions } from "@/lib/payment/transactions.functions";
import {
  paymentTypeLabel,
  transactionStatusLabel,
  transactionTone,
} from "@/lib/payment/types";
import { formatMoney } from "@/lib/payment-status";
import { formatDate } from "@/lib/request-status";

export const Route = createFileRoute("/dashboard/payments")({
  head: () => ({
    meta: [
      { title: "My Payments | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Track every payment linked to your Amazingfly Travels flight, hotel and visa applications in one secure place.",
      },
      { property: "og:title", content: "My Payments | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Your Amazingfly Travels payment history, amounts and transaction references.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MyPaymentsPage,
});

function MyPaymentsPage() {
  const { data: session } = useSessionQuery();
  const fetchTransactions = useServerFn(getMyPaymentTransactions);

  const transactions = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => fetchTransactions(),
    enabled: Boolean(session?.user),
  });

  const rows = transactions.data ?? [];

  return (
    <AccountShell
      title="My payments"
      subtitle="Every payment linked to your travel applications, with amounts and transaction references."
    >
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <p className="flex items-center gap-2 text-sm font-bold text-navy">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Secure online payment with Paystack
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Payable requests continue through Amazingfly&apos;s secure checkout. Once Paystack confirms a
          successful card or bank payment, the transaction reference and status are recorded here
          automatically.
        </p>
      </div>

      {transactions.isPending ? (
        <div className="glass-card mt-6 flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card mt-6 rounded-3xl p-10 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-tint">
            <CreditCard className="h-5 w-5 text-navy" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold text-navy">No payments yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When you reach checkout for a payable request, its transaction will appear here with the
            amount, reference and latest payment status.
          </p>
          <Button asChild variant="ghost" className="mt-4 text-navy">
            <Link to="/my-requests">View my requests</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <li key={row.id} className="glass-card rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">
                    {paymentTypeLabel(row.payment_type)}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-navy">
                    {formatMoney(row.amount, row.currency)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${transactionTone(row.status)}`}
                >
                  {transactionStatusLabel(row.status)}
                </span>
              </div>
              <p className="mt-4 flex items-center gap-2 break-all text-xs text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {row.transaction_reference}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.request_reference ? `${row.request_reference} · ` : ""}
                {formatDate(row.paid_at ?? row.created_at)}
              </p>
              {row.request_id ? (
                <Button asChild variant="ghost" className="mt-4 text-navy-soft">
                  <Link to="/requests/$id" params={{ id: row.request_id }}>
                    View application
                  </Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
