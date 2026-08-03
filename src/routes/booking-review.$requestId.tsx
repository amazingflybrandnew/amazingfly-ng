import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  CalendarX,
  Clock,
  Loader2,
  Moon,
  Plane,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { getBookingReview, startBookingCheckout } from "@/lib/payment/checkout.functions";
import { formatMoney } from "@/lib/payment-status";
import { formatStayDate, nightsBetween } from "@/lib/travel-api/hotel-format";

export const Route = createFileRoute("/booking-review/$requestId")({
  head: () => ({
    meta: [
      { title: "Review Your Booking | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Check your selected flight or hotel, passenger and stay details and the total payable before continuing to payment.",
      },
      { property: "og:title", content: "Review Your Booking | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Verify your Amazingfly Travels booking details before payment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BookingReviewPage,
});

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-white/60 py-3 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}

function BookingReviewPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();

  const fetchReview = useServerFn(getBookingReview);
  const startCheckout = useServerFn(startBookingCheckout);

  const review = useQuery({
    queryKey: ["booking-review", requestId],
    queryFn: () => fetchReview({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const proceed = useMutation({
    mutationFn: () => startCheckout({ data: { request_id: requestId } }),
    onSuccess: (result) => {
      if (result.ok) void navigate({ to: "/checkout/$requestId", params: { requestId } });
    },
  });

  const data = review.data;
  const nights =
    data?.hotel?.nights ?? nightsBetween(data?.hotel?.checkIn, data?.hotel?.checkOut);

  return (
    <AccountShell
      title="Review your booking"
      subtitle="Please confirm every detail below. Nothing is charged at this step."
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
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass-card rounded-3xl p-6 md:p-8">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-tint">
              {data.kind === "hotel" ? (
                <BedDouble className="h-5 w-5 text-navy" aria-hidden="true" />
              ) : (
                <Plane className="h-5 w-5 text-navy" aria-hidden="true" />
              )}
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-navy">{data.serviceType}</h2>
            <p className="text-sm text-muted-foreground">Reference {data.reference || "—"}</p>

            {data.kind === "flight" && data.flight ? (
              <div className="mt-5">
                <Row label="Airline" value={data.flight.airline ?? "—"} />
                <Row label="Flight number" value={data.flight.flightNumber ?? "—"} />
                <Row label="Departure airport" value={data.flight.origin ?? "—"} />
                <Row label="Arrival airport" value={data.flight.destination ?? "—"} />
                <Row label="Departure" value={formatDateTime(data.flight.departureAt)} />
                <Row label="Arrival" value={formatDateTime(data.flight.arrivalAt)} />
                <Row label="Duration" value={data.flight.duration ?? "—"} />
                <Row
                  label="Stops"
                  value={
                    data.flight.stops === null
                      ? "—"
                      : data.flight.stops === 0
                        ? "Non-stop"
                        : `${data.flight.stops} stop(s)`
                  }
                />
                <Row
                  label="Cabin class"
                  value={(data.flight.cabinClass ?? "—").replace("_", " ")}
                />
                <Row
                  label="Passengers"
                  value={
                    data.flight.passengers
                      ? `${data.flight.passengers} passenger(s)`
                      : "—"
                  }
                />
              </div>
            ) : null}

            {data.kind === "hotel" && data.hotel ? (
              <div className="mt-5">
                {data.hotel.imageUrl ? (
                  <img
                    src={data.hotel.imageUrl}
                    alt={data.hotel.name ?? "Selected hotel"}
                    loading="lazy"
                    className="mb-5 h-48 w-full rounded-2xl object-cover"
                  />
                ) : null}
                <Row label="Hotel" value={data.hotel.name ?? "—"} />
                <Row
                  label="Location"
                  value={data.hotel.location ?? data.hotel.address ?? "—"}
                />
                <Row label="Room type" value={data.hotel.roomType ?? "To be confirmed"} />
                <Row label="Check-in" value={formatStayDate(data.hotel.checkIn)} />
                <Row label="Check-out" value={formatStayDate(data.hotel.checkOut)} />
                <Row label="Nights" value={nights > 0 ? `${nights} night(s)` : "—"} />
                <Row
                  label="Guests"
                  value={data.hotel.guests ? `${data.hotel.guests} guest(s)` : "—"}
                />
                <Row
                  label="Rooms"
                  value={data.hotel.rooms ? `${data.hotel.rooms} room(s)` : "—"}
                />
                <Row label="Meal plan" value={data.hotel.boardType ?? "Room only"} />
                <Row
                  label="Cancellation policy"
                  value={data.hotel.cancellationPolicy ?? "Confirmed by our team"}
                />
              </div>
            ) : null}

            {data.kind === "other" ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Your specialist will confirm the full details of this service before payment.
              </p>
            ) : null}

            {data.kind === "hotel" ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: CalendarCheck, label: formatStayDate(data.hotel?.checkIn) },
                  { icon: CalendarX, label: formatStayDate(data.hotel?.checkOut) },
                  { icon: Moon, label: nights > 0 ? `${nights} night(s)` : "—" },
                  { icon: Users, label: `${data.hotel?.guests ?? 1} guest(s)` },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 p-3 text-xs font-semibold text-navy"
                  >
                    <item.icon className="h-3.5 w-3.5 text-orange" aria-hidden="true" />
                    {item.label}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">
                Total price
              </p>
              <p className="mt-2 text-4xl font-extrabold text-navy">
                {formatMoney(data.amount, data.currency)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Currency: {data.currency}</p>

              {proceed.data && !proceed.data.ok ? (
                <p className="mt-4 rounded-2xl bg-peach-tint px-4 py-3 text-sm text-navy">
                  {proceed.data.message}
                </p>
              ) : null}

              <Button
                size="lg"
                className="btn-gradient mt-6 w-full text-white"
                disabled={proceed.isPending}
                onClick={() => proceed.mutate()}
              >
                {proceed.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Continue to Payment
              </Button>

              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                No card details are collected here. Amazingfly Travels re-confirms every rate
                with the airline or property before any payment is taken.
              </p>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-navy">
                <Clock className="h-4 w-4" aria-hidden="true" />
                What happens next
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Continuing creates a payment reference for this booking. You will then see your
                payment summary while our secure checkout is finalised.
              </p>
              <Button asChild variant="ghost" className="mt-3 text-navy-soft">
                <Link to="/requests/$id" params={{ id: requestId }}>
                  View full request
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
