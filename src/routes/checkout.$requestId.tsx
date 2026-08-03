import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { getBookingReview } from "@/lib/payment/checkout.functions";
import { initializePayment } from "@/lib/payment/paystack.functions";
import { verifyPayment } from "@/lib/payment/verify.functions";
import { formatMoney } from "@/lib/payment-status";
import { transactionStatusLabel, transactionTone } from "@/lib/payment/types";
import { getFlightOfferInfo } from "@/lib/travel-api/flight-offer.functions";
import { holdBooking } from "@/lib/booking/hold.functions";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/booking/booking-status";

type CheckoutSearch = { reference?: string; trxref?: string };

export const Route = createFileRoute("/checkout/$requestId")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => {
    const out: CheckoutSearch = {};
    if (typeof search["reference"] === "string") out.reference = search["reference"];
    if (typeof search["trxref"] === "string") out.trxref = search["trxref"];
    return out;
  },

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
  const startPayment = useServerFn(initializePayment);

  const review = useQuery({
    queryKey: ["booking-review", requestId],
    queryFn: () => fetchReview({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const fetchOfferInfo = useServerFn(getFlightOfferInfo);
  const holdFn = useServerFn(holdBooking);

  const offerId = review.data?.offerId ?? null;
  const offer = useQuery({
    queryKey: ["flight-offer-info", offerId],
    queryFn: () => fetchOfferInfo({ data: { offer_id: offerId as string } }),
    enabled: Boolean(offerId),
  });

  const hold = useMutation({
    mutationFn: () => holdFn({ data: { request_id: requestId } }),
    onSuccess: (result) => {
      if (result.ok) void review.refetch();
    },
  });

  const pay = useMutation({
    mutationFn: () => startPayment({ data: { request_id: requestId } }),
    onSuccess: (result) => {
      if (result.ok) window.location.href = result.authorizationUrl;
    },
  });

  // ---- Paystack callback: verify the reference once, on the server ---------
  const search = Route.useSearch();
  const navigate = useNavigate();
  const verifyFn = useServerFn(verifyPayment);
  const verifiedRef = useRef<string | null>(null);
  const callbackReference = search.reference ?? search.trxref ?? null;

  const verify = useMutation({
    mutationFn: (reference: string) => verifyFn({ data: { reference } }),
    onSuccess: async (result) => {
      await review.refetch();
      if (result.ok && result.status === "successful") {
        void navigate({ to: "/booking-confirmation/$requestId", params: { requestId } });
      }
    },
  });

  useEffect(() => {
    if (!callbackReference || !session?.user) return;
    if (verifiedRef.current === callbackReference) return;
    verifiedRef.current = callbackReference;
    verify.mutate(callbackReference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbackReference, session?.user?.id]);

  const verifyMessage = verify.isPending
    ? "Confirming your payment with Paystack…"
    : verify.data && !verify.data.ok
      ? verify.data.message
      : verify.data && verify.data.ok && verify.data.status !== "successful"
        ? "That payment was not completed. You can try again below."
        : null;

  const payError = pay.isError
    ? "We could not start the secure payment. Please try again."
    : pay.data && !pay.data.ok
      ? pay.data.message
      : null;
  const redirecting = pay.isPending || Boolean(pay.data?.ok);


  const data = review.data;
  const transaction = data?.transaction ?? null;
  const canHold = Boolean(offer.data?.ok && offer.data.info.supportsHold);
  const heldAlready = data?.bookingStatus === "on_hold" || Boolean(data?.pnr);
  const holdError = hold.data && !hold.data.ok ? hold.data.message : null;
  const deadline = data?.paymentDeadline ?? null;

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
              {data.kind === "flight" ? (
                <>
                  <Row label="Travellers" value={`${data.passengerCount || data.flight?.passengers || 1}`} />
                  <Row label="Airline reference (PNR)" value={data.pnr ?? "Issued after booking"} />
                  <Row label="Airline order ID" value={data.duffelOrderId ?? "—"} />
                  <Row label="Ticket number" value={data.ticketNumber ?? "Issued after payment"} />
                </>
              ) : null}
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

              <Button
                size="lg"
                className="btn-gradient mt-6 w-full text-white"
                onClick={() => pay.mutate()}
                disabled={redirecting || transaction?.status === "successful"}
              >
                {redirecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {redirecting ? "Preparing secure payment..." : "Pay Now"}
              </Button>

              {payError ? (
                <p className="mt-3 flex items-start gap-2 text-xs font-medium text-coral">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {payError}
                </p>
              ) : (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  You will be taken to Paystack's secure checkout to complete this payment.
                </p>
              )}

              {data.kind === "flight" && !heldAlready && canHold ? (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    className="mt-3 w-full border-navy/20 text-navy"
                    onClick={() => hold.mutate()}
                    disabled={hold.isPending}
                  >
                    {hold.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Timer className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Book on Hold (pay later)
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Reserves your seat with the airline. The fare is only guaranteed until the
                    airline's payment deadline.
                  </p>
                </>
              ) : null}

              {data.kind === "flight" && !canHold && !heldAlready && offer.data?.ok ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  This airline requires immediate payment — holding is not available on this fare.
                </p>
              ) : null}

              {holdError ? (
                <p className="mt-3 flex items-start gap-2 text-xs font-medium text-coral">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {holdError}
                </p>
              ) : null}

              {heldAlready ? (
                <div className="mt-4 rounded-2xl border border-peach/60 bg-peach-tint p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Reservation held
                  </p>
                  {data.pnr ? (
                    <p className="mt-1 text-sm text-navy">
                      Airline reference (PNR): <span className="font-extrabold">{data.pnr}</span>
                    </p>
                  ) : null}
                  {deadline ? (
                    <p className="mt-1 text-xs text-navy-soft">
                      Pay before {new Date(deadline).toLocaleString("en-GB")} or the airline will
                      release this reservation.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <span
                className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${bookingStatusTone(
                  data.bookingStatus,
                )}`}
              >
                Booking: {bookingStatusLabel(data.bookingStatus)}
              </span>

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
