import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Plane,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import {
  confirmRequestPayment,
  getPaymentSummary,
  requestPaymentRefund,
  startRequestPayment,
} from "@/lib/payments.functions";
import { formatMoney, paymentStatusLabel, paymentTone } from "@/lib/payment-status";
import { STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";

type PaymentSearch = { reference?: string };

export const Route = createFileRoute("/payment/$requestId")({
  validateSearch: (search: Record<string, unknown>): PaymentSearch =>
    typeof search["reference"] === "string" ? { reference: search["reference"] } : {},
  head: () => ({
    meta: [
      { title: "Complete Your Payment | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Review your Amazingfly Travels application, confirm the amount payable and complete your payment securely.",
      },
      { property: "og:title", content: "Complete Your Payment | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Secure checkout for your Amazingfly Travels service request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-white/60 py-3 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}

function PaymentPage() {
  const { requestId } = Route.useParams();
  const search = useSearch({ from: "/payment/$requestId" }) as PaymentSearch;
  const { data: session } = useSessionQuery();
  const queryClient = useQueryClient();

  const fetchSummary = useServerFn(getPaymentSummary);
  const startPayment = useServerFn(startRequestPayment);
  const confirmPayment = useServerFn(confirmRequestPayment);
  const askRefund = useServerFn(requestPaymentRefund);

  const [notice, setNotice] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ["payment", requestId],
    queryFn: () => fetchSummary({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const confirm = useMutation({
    mutationFn: (reference: string) =>
      confirmPayment({ data: { request_id: requestId, reference } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payment", requestId] });
      await queryClient.invalidateQueries({ queryKey: ["account"] });
    },
  });

  // When the provider redirects back with a reference, verify it once.
  const reference = search.reference;
  useEffect(() => {
    if (reference && session?.user) confirm.mutate(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, session?.user?.id]);

  const proceed = useMutation({
    mutationFn: () =>
      startPayment({ data: { request_id: requestId, origin: window.location.origin } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setNotice(
        `Payment reference ${result.reference} created. Our team will send you the payment instructions shortly.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["payment", requestId] });
    },
    onError: () => setNotice("We could not start this payment. Please try again."),
  });

  const refund = useMutation({
    mutationFn: () => askRefund({ data: { request_id: requestId } }),
    onSuccess: async (result) => {
      setNotice(result.ok ? "Refund requested. Our team will be in touch." : (result.message ?? null));
      await queryClient.invalidateQueries({ queryKey: ["payment", requestId] });
    },
  });

  const data = summary.data;
  const paid = data?.payment_status === "payment_received";
  const amountLabel = useMemo(
    () => formatMoney(data?.amount ?? null, data?.currency ?? "NGN"),
    [data?.amount, data?.currency],
  );

  return (
    <AccountShell
      title="Complete your payment"
      subtitle="Review your application details and pay securely to keep your request moving."
    >
      {summary.isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : !data ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            We could not find this request on your account.
          </p>
          <Button asChild variant="ghost" className="mt-4 text-navy">
            <Link to="/my-requests">Back to my requests</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="glass-card rounded-3xl p-6 md:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint">
              <Plane className="h-5 w-5 text-navy" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-navy">
              {data.request.service_type ?? "Travel service"}
            </h2>
            <div className="mt-4">
              <Row label="Application reference" value={data.request.request_reference || "—"} />
              <Row label="Service selected" value={data.request.service_type ?? "—"} />
              <Row label="Destination" value={data.request.destination_country ?? "—"} />
              <Row label="Travel date" value={formatDate(data.request.travel_date)} />
              <Row
                label="Request status"
                value={STATUS_LABELS[data.request.request_status] ?? data.request.request_status}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusTone(
                  data.request.request_status,
                )}`}
              >
                {STATUS_LABELS[data.request.request_status] ?? data.request.request_status}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${paymentTone(
                  data.payment_status,
                )}`}
              >
                {paymentStatusLabel(data.payment_status)}
              </span>
            </div>

            <Button asChild variant="ghost" className="mt-6 text-navy-soft">
              <Link to="/requests/$id" params={{ id: requestId }}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to request
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">
                Amount payable
              </p>
              <p className="mt-2 text-4xl font-extrabold text-navy">{amountLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Handled by {data.providerLabel}.
              </p>

              {confirm.isPending ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-navy-soft">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Confirming your payment…
                </p>
              ) : null}

              {notice ? (
                <p className="mt-4 rounded-2xl border border-white/60 bg-white/70 p-3 text-sm text-navy">
                  {notice}
                </p>
              ) : null}

              {paid ? (
                <>
                  <p className="mt-5 rounded-2xl border border-mint/50 bg-mint-tint p-3 text-sm font-semibold text-navy">
                    Payment received — thank you. Your request is now with our specialists.
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-3 w-full text-navy-soft"
                    disabled={refund.isPending}
                    onClick={() => refund.mutate()}
                  >
                    Request a refund
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  className="btn-gradient mt-6 w-full text-white"
                  disabled={proceed.isPending || !data.amount}
                  onClick={() => proceed.mutate()}
                >
                  {proceed.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  Proceed to Payment
                </Button>
              )}

              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Payments are processed on a secure provider page. Amazingfly Travels never stores
                your card details.
              </p>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-navy">
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
                Payment history
              </p>
              {data.payments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No payment attempts yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {data.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="rounded-2xl border border-white/60 bg-white/70 p-3"
                    >
                      <p className="text-sm font-semibold text-navy">
                        {formatMoney(payment.amount, payment.currency)}
                      </p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {payment.transaction_reference}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {paymentStatusLabel(payment.status)} · {formatDate(payment.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
