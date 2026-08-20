import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BedDouble,
  BellRing,
  Briefcase,
  CalendarCheck,
  CalendarX,
  Clock,
  Loader2,
  Moon,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import {
  getBookingReview,
  saveFlightAddOns,
  startBookingCheckout,
} from "@/lib/payment/checkout.functions";
import { FLIGHT_ADD_ONS } from "@/lib/booking/flight-addons";
import { formatMoney } from "@/lib/payment-status";
import { formatStayDate, nightsBetween } from "@/lib/travel-api/hotel-format";
import { getFlightOfferInfo } from "@/lib/travel-api/flight-offer.functions";
import { getBookingPassengers } from "@/lib/booking/passengers.functions";
import { fareRuleLabel, INFO_FALLBACK } from "@/lib/travel-api/flight-offer.types";
import { passengerFullName } from "@/lib/booking/passenger.types";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/booking/booking-status";

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

function selectedAddOnDetails(ids: readonly string[]) {
  const selected = new Set(ids);
  return FLIGHT_ADD_ONS.filter((item) => selected.has(item.id));
}

function BookingReviewPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();

  const fetchReview = useServerFn(getBookingReview);
  const startCheckout = useServerFn(startBookingCheckout);
  const saveAddOns = useServerFn(saveFlightAddOns);

  const review = useQuery({
    queryKey: ["booking-review", requestId],
    queryFn: () => fetchReview({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const fetchOfferInfo = useServerFn(getFlightOfferInfo);
  const fetchPassengers = useServerFn(getBookingPassengers);

  const offerId = review.data?.offerId ?? null;
  const offer = useQuery({
    queryKey: ["flight-offer-info", offerId],
    queryFn: () => fetchOfferInfo({ data: { offer_id: offerId as string } }),
    enabled: Boolean(offerId),
  });

  const passengers = useQuery({
    queryKey: ["booking-passengers", requestId],
    queryFn: () => fetchPassengers({ data: { request_id: requestId } }),
    enabled: Boolean(session?.user),
  });

  const proceed = useMutation({
    mutationFn: () => startCheckout({ data: { request_id: requestId } }),
    onSuccess: (result) => {
      if (result.ok) void navigate({ to: "/checkout/$requestId", params: { requestId } });
    },
  });

  const addOns = useMutation({
    mutationFn: (ids: string[]) => saveAddOns({ data: { request_id: requestId, add_ons: ids } }),
    onSuccess: (result) => {
      if (result.ok) void review.refetch();
    },
  });

  const data = review.data;
  const needsPassengers =
    data?.kind === "flight" && (passengers.data?.passengers.length ?? 0) === 0;
  const nights = data?.hotel?.nights ?? nightsBetween(data?.hotel?.checkIn, data?.hotel?.checkOut);
  const selectedAddOns = selectedAddOnDetails(data?.selectedAddOns ?? []);

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
                  value={data.flight.passengers ? `${data.flight.passengers} passenger(s)` : "—"}
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
                <Row label="Location" value={data.hotel.location ?? data.hotel.address ?? "—"} />
                <Row label="Room type" value={data.hotel.roomType ?? "To be confirmed"} />
                <Row label="Check-in" value={formatStayDate(data.hotel.checkIn)} />
                <Row label="Check-out" value={formatStayDate(data.hotel.checkOut)} />
                <Row label="Nights" value={nights > 0 ? `${nights} night(s)` : "—"} />
                <Row
                  label="Guests"
                  value={data.hotel.guests ? `${data.hotel.guests} guest(s)` : "—"}
                />
                <Row label="Rooms" value={data.hotel.rooms ? `${data.hotel.rooms} room(s)` : "—"} />
                <Row label="Meal plan" value={data.hotel.boardType ?? "Room only"} />
                <Row
                  label="Cancellation policy"
                  value={data.hotel.cancellationPolicy ?? "Confirmed by our team"}
                />
              </div>
            ) : null}

            {data.kind === "flight" ? (
              <div className="mt-6 rounded-2xl border border-white/70 bg-white/60 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Ticket className="h-4 w-4 text-orange" aria-hidden="true" />
                  Airline fare conditions
                </p>
                {offer.isPending ? (
                  <p className="mt-2 text-sm text-muted-foreground">Checking with the airline…</p>
                ) : offer.data?.ok ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <p className="flex items-start gap-2 text-sm text-navy">
                      <RefreshCcw
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-soft"
                        aria-hidden="true"
                      />
                      {fareRuleLabel(offer.data.info.refund, "refund")}
                    </p>
                    <p className="flex items-start gap-2 text-sm text-navy">
                      <CalendarCheck
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-soft"
                        aria-hidden="true"
                      />
                      {fareRuleLabel(offer.data.info.change, "change")}
                    </p>
                    <p className="flex items-start gap-2 text-sm text-navy">
                      <Briefcase
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-soft"
                        aria-hidden="true"
                      />
                      {offer.data.info.baggage.checked === null &&
                      offer.data.info.baggage.carryOn === null
                        ? INFO_FALLBACK
                        : `${offer.data.info.baggage.carryOn ?? 0} carry-on · ${offer.data.info.baggage.checked ?? 0} checked bag(s)`}
                    </p>
                    <p className="flex items-start gap-2 text-sm text-navy">
                      <Plane
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-soft"
                        aria-hidden="true"
                      />
                      {offer.data.info.fareBrandName ??
                        offer.data.info.cabinMarketingName ??
                        INFO_FALLBACK}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{INFO_FALLBACK}</p>
                )}
              </div>
            ) : null}

            {data.kind === "flight" ? (
              <div className="mt-4 rounded-2xl border border-white/70 bg-white/60 p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy">
                    <UserRound className="h-4 w-4 text-orange" aria-hidden="true" />
                    Travellers
                  </p>
                  <Button asChild variant="ghost" size="sm" className="text-navy-soft">
                    <Link to="/passengers/$requestId" params={{ requestId }}>
                      Edit details
                    </Link>
                  </Button>
                </div>
                {(passengers.data?.passengers.length ?? 0) === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No traveller details saved yet — add them before payment.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {passengers.data?.passengers.map((passenger) => (
                      <li key={passenger.id} className="text-sm font-semibold text-navy">
                        {passengerFullName(passenger)}
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          {passenger.nationality}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {data.kind === "other" ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Your specialist will confirm the full details of this service before payment.
              </p>
            ) : null}

            {data.kind === "flight" && data.catalogueId !== "visa-flight-reservation" ? (
              <div className="mt-6 rounded-2xl border border-white/70 bg-white/60 p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-tint">
                    <BellRing className="h-4 w-4 text-navy" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-navy">Enhance your trip</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      All add-ons are optional. Select only what you need; the total updates
                      automatically.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {FLIGHT_ADD_ONS.map((item) => {
                    const checked = data.selectedAddOns.includes(item.id);
                    const nextIds = checked
                      ? data.selectedAddOns.filter((id) => id !== item.id)
                      : [...data.selectedAddOns, item.id];
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-colors ${
                          checked ? "border-sky/60 bg-sky-tint/70" : "border-white/80 bg-white/70"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-navy">{item.name}</p>
                              {checked ? (
                                <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                  Selected
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                            <span className="text-sm font-extrabold text-navy">
                              {formatMoney(item.priceNgn, "NGN")}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant={checked ? "outline" : "default"}
                              disabled={addOns.isPending}
                              aria-pressed={checked}
                              onClick={() => addOns.mutate(nextIds)}
                              className={
                                checked ? "border-coral/50 text-coral" : "btn-gradient text-white"
                              }
                            >
                              {addOns.isPending ? (
                                <Loader2
                                  className="mr-1.5 h-3.5 w-3.5 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : null}
                              {checked ? "Remove" : "Add"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {addOns.data && !addOns.data.ok ? (
                  <p className="mt-3 text-xs font-medium text-coral">{addOns.data.message}</p>
                ) : null}
              </div>
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
                {formatMoney(data.chargeAmount, data.chargeCurrency)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Currency: {data.chargeCurrency}</p>
              {data.kind === "flight" && data.addOnTotal > 0 ? (
                <div className="mt-4 space-y-2 border-t border-white/70 pt-4 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Flight fare</span>
                    <span className="font-semibold text-navy">
                      {formatMoney(data.chargeAmount - data.addOnTotal, data.chargeCurrency)}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold text-navy">Selected add-ons</span>
                    <span className="font-semibold text-navy">
                      {formatMoney(data.addOnTotal, "NGN")}
                    </span>
                  </p>
                  <ul className="space-y-1.5 border-t border-white/70 pt-2">
                    {selectedAddOns.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="shrink-0 font-semibold text-navy">
                          {formatMoney(item.priceNgn, "NGN")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {proceed.data && !proceed.data.ok ? (
                <p className="mt-4 rounded-2xl bg-peach-tint px-4 py-3 text-sm text-navy">
                  {proceed.data.message}
                </p>
              ) : null}

              <span
                className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${bookingStatusTone(
                  data.bookingStatus,
                )}`}
              >
                {bookingStatusLabel(data.bookingStatus)}
              </span>

              {needsPassengers ? (
                <p className="mt-4 rounded-2xl bg-peach-tint px-4 py-3 text-sm text-navy">
                  Add traveller details before continuing to payment.
                </p>
              ) : null}

              <Button
                size="lg"
                className="btn-gradient mt-6 w-full text-white"
                disabled={proceed.isPending || needsPassengers}
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
                No card details are collected here. Amazingfly Travels re-confirms every rate with
                the airline or property before any payment is taken.
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
