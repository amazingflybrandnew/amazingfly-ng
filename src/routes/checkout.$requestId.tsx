import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CreditCard, Loader2, ReceiptText, ShieldCheck } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { getBookingReview } from "@/lib/payment/checkout.functions";
import { formatMoney } from "@/lib/payment-status";
import { transactionStatusLabel, transactionTone } from "@/lib/payment/types";

export const Route = createFileRoute("/checkout/$requestId")({
  head: () => ({
    meta: [
      { title: "Your Booking Is Ready | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Your Amazingfly Travels booking summary, reference and amount payable, ready for secure checkout.",
      },
      { property: "og:title", content: "Your Booking Is Ready | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Payment summary for your Amazingfly Travels booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-white/60 py-3 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}

function CheckoutPage() {
  const { requestId } = Route.useParams();
  const { data: session } = useSessionQuery();
  const fetchReview = useServerFn(getBookingReview);

  const review = useQuery({
    queryKey: ["booking-review", requestId],
    queryFn: () => fetchReview({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const data = review.data;
  const transaction = data?.transaction ?? null;

  const summary =
    data?.kind === "hotel"
      ? [data.hotel?.name, data.hotel?.location, data.hotel?.roomType].filter(Boolean).join(" · ")
      : data?.kind === "flight"
        ? [
            data.flight?.airline,
            data.flight?.flightNumber,
            data.flight?.origin && data.flight?.destination
              ? `${data.flight.origin} → ${data.flight.destination}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : (data?.serviceType ?? "");

  return (
    <AccountShell
      title="Your booking is ready"
      subtitle="Here is everything we need to take payment once secure checkout goes live."
    >
      {review.isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : !data ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            We could not find this booking on your account.
          </p>
          <Button asChild variant="ghost" className="mt-4 text-navy">
            <Link to="/my-requests">Back to my requests</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="glass-card rounded-3xl p-6 md:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-tint">
              <CheckCircle2 className="h-5 w-5 text-navy" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-navy">Booking summary</h2>
            <div className="mt-4">
              <Row label="Request reference" value={data.reference || "—"} />
              <Row label="Service type" value={data.serviceType} />
              <Row label="Booking" value={summary || "—"} />
              <Row
                label="Payment reference"
                value={transaction?.transaction_reference ?? "Not created yet"}
              />
              <Row label="Currency" value={data.currency} />
            </div>

            <Button asChild variant="ghost" className="mt-6 text-navy-soft">
              <Link to="/booking-review/$requestId" params={{ requestId }}>
                Back to booking review
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">
                Amount payable
              </p>
              <p className="mt-2 text-4xl font-extrabold text-navy">
                {formatMoney(transaction?.amount ?? data.amount, transaction?.currency ?? data.currency)}
              </p>
              <span
                className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${transactionTone(
                  transaction?.status ?? "pending",
                )}`}
              >
                {transaction?.status === "successful"
                  ? transactionStatusLabel(transaction.status)
                  : "Awaiting Payment"}
              </span>

              <Button size="lg" className="btn-gradient mt-6 w-full text-white" disabled>
                <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                Pay Now
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Secure online checkout is being finalised. Your specialist will confirm payment
                instructions for this reference.
              </p>

              {transaction ? (
                <p className="mt-4 flex items-center gap-2 break-all text-xs text-muted-foreground">
                  <ReceiptText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {transaction.transaction_reference}
                </p>
              ) : null}

              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                All payment records are created securely on our servers — no card details are
                stored in your browser.
              </p>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <p className="text-sm font-bold text-navy">Need a change?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Message your specialist from the request page and we will update this booking
                before payment.
              </p>
              <Button asChild variant="ghost" className="mt-3 text-navy-soft">
                <Link to="/requests/$id" params={{ id: requestId }}>
                  Open request
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
