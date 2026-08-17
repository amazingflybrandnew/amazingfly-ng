import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BedDouble,
  CheckCircle2,
  Loader2,
  Plane,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { getBookingConfirmation } from "@/lib/payment/verify.functions";
import { formatMoney } from "@/lib/payment-status";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/booking/booking-status";
import { TITLE_LABELS } from "@/lib/booking/passenger.types";
import { formatDate } from "@/lib/request-status";
import { cancelStoredHotelBooking } from "@/lib/travel-api/hotel-booking.functions";

export const Route = createFileRoute("/booking-confirmation/$requestId")({
  head: () => ({
    meta: [
      { title: "Booking Confirmed | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Your Amazingfly Travels payment was received and your booking details are confirmed below.",
      },
      { property: "og:title", content: "Booking Confirmed | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Payment receipt and booking confirmation for your Amazingfly Travels request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfirmationPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-white/60 py-3 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}

function dateTime(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-GB");
}

function ConfirmationPage() {
  const { requestId } = Route.useParams();
  const { data: session } = useSessionQuery();
  const fetchConfirmation = useServerFn(getBookingConfirmation);
  const cancelHotel = useServerFn(cancelStoredHotelBooking);

  const confirmation = useQuery({
    queryKey: ["booking-confirmation", requestId],
    queryFn: () => fetchConfirmation({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const cancellation = useMutation({
    mutationFn: () => cancelHotel({ data: { request_id: requestId } }),
    onSuccess: (result) => {
      if (result.ok) void confirmation.refetch();
    },
  });

  const data = confirmation.data;
  const review = data?.review ?? null;
  const paid = review?.transaction?.status === "successful" ? review.transaction : null;
  const canCancelHotel = review?.kind === "hotel" && review.bookingStatus === "confirmed";

  return (
    <AccountShell
      title="Booking confirmed"
      subtitle="Your payment has been received and your booking details are saved to your account."
    >
      {confirmation.isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : !review ? (
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
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 md:p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-tint">
                <CheckCircle2 className="h-6 w-6 text-navy" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-2xl font-extrabold text-navy">
                {paid ? "Payment successful" : "Booking summary"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {paid
                  ? "Thank you. We have received your payment and your booking is confirmed."
                  : review.kind === "hotel" && review.bookingStatus === "confirmed"
                    ? "Your hotel reservation is confirmed."
                    : "This booking has not been paid yet."}
              </p>

              <div className="mt-5">
                <Row label="Request reference" value={review.reference || "—"} />
                <Row
                  label="Transaction reference"
                  value={review.transaction?.transaction_reference ?? "—"}
                />
                <Row
                  label="Amount paid"
                  value={formatMoney(
                    review.transaction?.amount ?? review.amount,
                    review.transaction?.currency ?? review.currency,
                  )}
                />
                <Row label="Currency" value={review.transaction?.currency ?? review.currency} />
                <Row label="Paid on" value={dateTime(review.transaction?.paid_at ?? null)} />
              </div>

              <span
                className={`mt-5 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${bookingStatusTone(
                  review.bookingStatus,
                )}`}
              >
                Booking: {bookingStatusLabel(review.bookingStatus)}
              </span>
            </div>

            {review.kind === "flight" ? (
              <div className="glass-card rounded-3xl p-6 md:p-8">
                <p className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Plane className="h-4 w-4" aria-hidden="true" />
                  Flight details
                </p>
                <div className="mt-4">
                  <Row label="Airline" value={review.flight?.airline ?? "—"} />
                  <Row label="Flight number" value={review.flight?.flightNumber ?? "—"} />
                  <Row
                    label="Route"
                    value={
                      review.flight?.origin && review.flight?.destination
                        ? `${review.flight.origin} → ${review.flight.destination}`
                        : "—"
                    }
                  />
                  <Row label="Departure" value={dateTime(review.flight?.departureAt ?? null)} />
                  <Row label="Arrival" value={dateTime(review.flight?.arrivalAt ?? null)} />
                  <Row label="Cabin" value={review.flight?.cabinClass ?? "—"} />
                  <Row label="Airline reference (PNR)" value={review.pnr ?? "Pending from airline"} />
                  <Row label="Airline order ID" value={review.duffelOrderId ?? "—"} />
                  <Row label="Ticket number" value={review.ticketNumber ?? "Being issued"} />
                </div>
              </div>
            ) : null}

            {review.kind === "hotel" ? (
              <div className="glass-card rounded-3xl p-6 md:p-8">
                <p className="flex items-center gap-2 text-sm font-bold text-navy">
                  <BedDouble className="h-4 w-4" aria-hidden="true" />
                  Hotel details
                </p>
                <div className="mt-4">
                  <Row label="Hotel" value={review.hotel?.name ?? "—"} />
                  <Row label="Location" value={review.hotel?.location ?? "—"} />
                  <Row label="Check-in" value={formatDate(review.hotel?.checkIn ?? null)} />
                  <Row label="Check-out" value={formatDate(review.hotel?.checkOut ?? null)} />
                  <Row label="Room" value={review.hotel?.roomType ?? "—"} />
                  <Row label="Board" value={review.hotel?.boardType ?? "—"} />
                  <Row label="Guests" value={`${review.hotel?.guests ?? 1}`} />
                  <Row
                    label="Booking reference"
                    value={review.pnr ?? "Voucher will be emailed to you"}
                  />
                </div>

                {canCancelHotel ? (
                  <div className="mt-6 rounded-2xl border border-coral/30 bg-coral-tint/50 p-4">
                    <p className="text-sm font-bold text-navy">Need to cancel this hotel?</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cancellation is submitted directly to RateHawk. Any applicable hotel penalty still follows the selected rate terms.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3"
                      disabled={cancellation.isPending}
                      onClick={() => cancellation.mutate()}
                    >
                      {cancellation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      Cancel hotel booking
                    </Button>
                  </div>
                ) : null}

                {cancellation.data && !cancellation.data.ok ? (
                  <p className="mt-4 rounded-2xl bg-coral-tint px-4 py-3 text-sm text-navy">
                    {cancellation.data.error}
                  </p>
                ) : null}
                {cancellation.data?.ok ? (
                  <p className="mt-4 rounded-2xl bg-mint-tint px-4 py-3 text-sm text-navy">
                    The hotel cancellation was accepted by RateHawk.
                  </p>
                ) : null}
              </div>
            ) : null}

            {data && data.passengers.length > 0 ? (
              <div className="glass-card rounded-3xl p-6 md:p-8">
                <p className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Travellers
                </p>
                <ul className="mt-3 space-y-2">
                  {data.passengers.map((passenger) => (
                    <li
                      key={passenger.id}
                      className="rounded-2xl border border-white/60 bg-white/70 p-3 text-sm font-semibold text-navy"
                    >
                      {TITLE_LABELS[passenger.title]} {passenger.firstName} {passenger.lastName}
                      <span className="ml-2 text-xs font-medium text-muted-foreground">
                        {passenger.nationality}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 md:p-8">
              <p className="flex items-center gap-2 text-sm font-bold text-navy">
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
                What happens next
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Our specialists are finalising your booking documents. You will receive an email
                confirmation, and everything stays available in your account.
              </p>
              <Button asChild className="btn-gradient mt-4 w-full text-white">
                <Link to="/requests/$id" params={{ id: requestId }}>
                  View request
                </Link>
              </Button>
              <Button asChild variant="ghost" className="mt-2 w-full text-navy-soft">
                <Link to="/my-requests">Back to my requests</Link>
              </Button>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Payments are verified on our servers with Paystack. Amazingfly Travels never stores
                your card details.
              </p>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
