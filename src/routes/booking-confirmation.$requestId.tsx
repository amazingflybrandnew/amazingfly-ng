import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BedDouble,
  CheckCircle2,
  Download,
  Loader2,
  Plane,
  ReceiptText,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/booking/booking-status";
import { TITLE_LABELS } from "@/lib/booking/passenger.types";
import { downloadHotelConfirmationPdf } from "@/lib/hotel-confirmation-pdf";
import { formatMoney } from "@/lib/payment-status";
import { getBookingConfirmation } from "@/lib/payment/verify.functions";
import { formatDate } from "@/lib/request-status";
import { cancelHotelBooking } from "@/lib/travel-api/hotel-booking.functions";
import { isVisaFlightReservation } from "@/lib/visa-flight-reservation";

export const Route = createFileRoute("/booking-confirmation/$requestId")({
  head: () => ({
    meta: [
      { title: "Booking Confirmed | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Your Amazingfly Travels payment and supplier booking status are shown below.",
      },
      { property: "og:title", content: "Booking Confirmed | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Payment receipt and booking status for your Amazingfly Travels request.",
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
  const cancelHotel = useServerFn(cancelHotelBooking);

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
  const paidHotelBookingFailed =
    review?.kind === "hotel" && Boolean(paid) && review.bookingStatus === "failed";
  const paidFlightBookingFailed =
    review?.kind === "flight" && Boolean(paid) && review.bookingStatus === "failed";
  const visaFlightReservation = isVisaFlightReservation(review?.catalogueId);
  const bookingFailed = paidHotelBookingFailed || paidFlightBookingFailed;
  const canManageConfirmedHotel = review?.kind === "hotel" && review.bookingStatus === "confirmed";
  const canDownloadHotelConfirmation = Boolean(data && canManageConfirmedHotel);

  const downloadConfirmation = () => {
    if (
      !data ||
      data.review.kind !== "hotel" ||
      data.review.bookingStatus !== "confirmed"
    ) {
      return;
    }
    downloadHotelConfirmationPdf(data);
  };

  const requestCancellation = () => {
    if (!canManageConfirmedHotel || cancellation.isPending) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Cancel this confirmed hotel booking? The supplier cancellation terms will apply and this action cannot be undone here.",
      );
      if (!confirmed) return;
    }
    cancellation.mutate();
  };

  return (
    <AccountShell
      title={bookingFailed ? "Booking requires attention" : "Booking confirmed"}
      subtitle={
        bookingFailed
          ? "Your payment is recorded, but the supplier did not confirm the booking."
          : visaFlightReservation
            ? "Your genuine temporary airline reservation and its expiry are shown below."
          : "Your booking details are saved to your account."
      }
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
                {bookingFailed
                  ? `Payment received — ${review.kind} booking not confirmed`
                  : paid
                    ? "Payment successful"
                    : "Booking summary"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {bookingFailed
                  ? "Your payment was received successfully, but the supplier could not confirm the reservation. Please do not make another payment for this request while we review the booking."
                  : visaFlightReservation
                    ? "Payment was received for Amazingfly's processing and documentation service. The reservation below is temporary and is not a paid airline ticket."
                  : paid
                    ? "Thank you. We have received your payment and your booking details are below."
                    : "Your booking details and current supplier status are shown below."}
              </p>

              <div className="mt-5">
                <Row label="Request reference" value={review.reference || "—"} />
                <Row
                  label="Transaction reference"
                  value={review.transaction?.transaction_reference ?? "—"}
                />
                <Row
                  label={paid ? "Amount paid" : "Booking amount"}
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
                  <Row
                    label="Airline reference (PNR)"
                    value={review.pnr ?? "Pending from airline"}
                  />
                  <Row label="Airline order ID" value={review.duffelOrderId ?? "—"} />
                  <Row
                    label="Ticket number"
                    value={
                      visaFlightReservation
                        ? "Not applicable — temporary reservation"
                        : (review.ticketNumber ?? "Being issued")
                    }
                  />
                  {visaFlightReservation ? (
                    <Row label="Reservation expires" value={dateTime(review.holdExpiresAt)} />
                  ) : null}
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

                {data?.rateHawkDiagnostics ? (
                  <div className="mt-5 rounded-2xl border border-sky/50 bg-sky-tint p-4">
                    <p className="text-sm font-extrabold text-navy">RateHawk sandbox diagnostics</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Visible only while the RateHawk integration is running in sandbox.
                    </p>
                    <div className="mt-3">
                      <Row
                        label="Partner order ID"
                        value={data.rateHawkDiagnostics.partnerOrderId || "—"}
                      />
                      <Row
                        label="RateHawk order ID"
                        value={data.rateHawkDiagnostics.orderId ?? "—"}
                      />
                      <Row
                        label="Provider status"
                        value={
                          (data.rateHawkDiagnostics.providerStatus ??
                            data.rateHawkDiagnostics.status) || "—"
                        }
                      />
                      <Row
                        label="Booking attempts"
                        value={`${data.rateHawkDiagnostics.attempts}`}
                      />
                      {data.rateHawkDiagnostics.errorMessage ? (
                        <Row
                          label="Provider error"
                          value={data.rateHawkDiagnostics.errorMessage}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {canManageConfirmedHotel ? (
                  <div className="mt-5 border-t border-white/60 pt-5">
                    {canDownloadHotelConfirmation ? (
                      <Button
                        type="button"
                        className="btn-gradient text-white"
                        onClick={downloadConfirmation}
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        Download confirmation PDF
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3 text-coral"
                      disabled={cancellation.isPending}
                      onClick={requestCancellation}
                    >
                      {cancellation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      Cancel hotel booking
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Supplier cancellation terms and any applicable penalties still apply. Payment
                      refunds, when due, are handled separately.
                    </p>
                  </div>
                ) : null}

                {cancellation.data && !cancellation.data.ok ? (
                  <p className="mt-4 rounded-2xl bg-coral-tint px-4 py-3 text-sm text-navy">
                    {cancellation.data.error}
                  </p>
                ) : null}
                {cancellation.data?.ok ? (
                  <p className="mt-4 rounded-2xl bg-mint-tint px-4 py-3 text-sm text-navy">
                    The hotel booking was cancelled with the accommodation provider.
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
                {bookingFailed
                  ? "Your payment is recorded. Our team will review the failed supplier booking and contact you about rebooking or any applicable refund. Please do not make another payment for this request."
                  : visaFlightReservation
                    ? "Download or submit this itinerary only where a temporary reservation is accepted. Requirements vary by embassy or consulate, and visa approval is never guaranteed."
                  : "Our specialists are finalising your booking documents. You will receive an email confirmation, and everything stays available in your account."}
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
