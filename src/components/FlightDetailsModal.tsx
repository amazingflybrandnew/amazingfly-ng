import { Link } from "@tanstack/react-router";
import { Clock, MapPin, PlaneLanding, PlaneTakeoff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { FlightResult } from "@/lib/travel-api/flight.types";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function labelCabin(cabin: string) {
  return cabin.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FlightDetailsModal({
  flight,
  open,
  onOpenChange,
  onSelect,
  isSelected,
}: {
  flight: FlightResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (flight: FlightResult) => void;
  isSelected: boolean;
}) {
  if (!flight) return null;

  const travellers =
    flight.passengers.adults +
    (flight.passengers.children ?? 0) +
    (flight.passengers.infants ?? 0);
  const displayedPrice = flight.customerPrice ?? flight.price;
  const displayedCurrency = flight.customerCurrency ?? flight.currency;
  const perTraveller = travellers > 0 ? displayedPrice / travellers : displayedPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.75rem] border-white/70 bg-white/90 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            {flight.airlineLogoUrl ? (
              <img
                src={flight.airlineLogoUrl}
                alt={`${flight.airline} logo`}
                className="h-9 w-9 rounded-xl object-contain"
                loading="lazy"
              />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-tint to-lavender-tint">
                <PlaneTakeoff className="h-4 w-4 text-orange" aria-hidden="true" />
              </span>
            )}
            {flight.airline}
          </DialogTitle>
          <DialogDescription className="text-left">
            {flight.flightNumber || "Flight"} · {flight.origin} → {flight.destination} ·{" "}
            {labelCabin(flight.cabinClass)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <PlaneTakeoff className="h-3.5 w-3.5 text-orange" aria-hidden="true" /> Departure
            </p>
            <p className="mt-2 text-lg font-extrabold">{flight.origin}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(flight.departureTime)}</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <PlaneLanding className="h-3.5 w-3.5 text-orange" aria-hidden="true" /> Arrival
            </p>
            <p className="mt-2 text-lg font-extrabold">{flight.destination}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(flight.arrivalTime)}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/70 p-4 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange" aria-hidden="true" />
            <span className="font-semibold">{flight.duration}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange" aria-hidden="true" />
            <span className="font-semibold">
              {flight.stops === 0
                ? "Non-stop"
                : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4 text-orange" aria-hidden="true" />
            <span className="font-semibold">
              {travellers} traveller{travellers > 1 ? "s" : ""}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Price breakdown
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Adults × {flight.passengers.adults}
              </span>
              <span className="font-semibold">
                {formatPrice(perTraveller * flight.passengers.adults, displayedCurrency)}
              </span>
            </div>
            {flight.passengers.children ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Children × {flight.passengers.children}
                </span>
                <span className="font-semibold">
                  {formatPrice(perTraveller * flight.passengers.children, displayedCurrency)}
                </span>
              </div>
            ) : null}
            {flight.passengers.infants ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Infants × {flight.passengers.infants}
                </span>
                <span className="font-semibold">
                  {formatPrice(perTraveller * flight.passengers.infants, displayedCurrency)}
                </span>
              </div>
            ) : null}
            <Separator />
            <div className="flex justify-between text-base">
              <span className="font-semibold">Total fare</span>
              <span className="font-extrabold">
                {formatPrice(displayedPrice, displayedCurrency)}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Displayed in {displayedCurrency}. Amazingfly collects the customer payment through
            Paystack, then settles Duffel separately in {flight.currency} from the funded Duffel
            Balance.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            className="btn-gradient border-0 text-white"
            onClick={() => onSelect(flight)}
          >
            {isSelected ? "Selected" : "Select this flight"}
          </Button>
          <Button asChild variant="outline">
            <Link
              to="/request"
              search={{ service: "flights", from: flight.origin, to: flight.destination }}
            >
              Continue to request
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
