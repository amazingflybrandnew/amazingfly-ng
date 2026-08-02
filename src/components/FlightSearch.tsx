import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2, PlaneTakeoff, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchFlightOffers } from "@/lib/travel-api/flights.functions";
import { CABIN_CLASSES, type CabinClass, type FlightResult } from "@/lib/travel-api/flight.types";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

function FlightCard({ flight }: { flight: FlightResult }) {
  return (
    <article className="hover-lift rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {flight.airlineLogoUrl ? (
            <img
              src={flight.airlineLogoUrl}
              alt={`${flight.airline} logo`}
              className="h-10 w-10 rounded-xl object-contain"
              loading="lazy"
            />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-tint to-lavender-tint">
              <PlaneTakeoff className="h-5 w-5 text-orange" aria-hidden="true" />
            </span>
          )}
          <div>
            <p className="text-sm font-bold">{flight.airline}</p>
            <p className="text-xs text-muted-foreground">
              {flight.flightNumber || "Flight"} · {flight.cabinClass.replace("_", " ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-lg font-extrabold leading-none">{formatTime(flight.departureTime)}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{flight.origin}</p>
            <p className="text-[11px] text-muted-foreground">{formatDate(flight.departureTime)}</p>
          </div>
          <div className="min-w-24 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground">{flight.duration}</p>
            <div className="my-1 h-px w-full bg-gradient-to-r from-sky via-lavender to-orange" />
            <p className="text-[11px] text-muted-foreground">
              {flight.stops === 0 ? "Non-stop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold leading-none">{formatTime(flight.arrivalTime)}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{flight.destination}</p>
            <p className="text-[11px] text-muted-foreground">{formatDate(flight.arrivalTime)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
          <div className="text-right">
            <p className="text-xl font-extrabold">{formatPrice(flight.price, flight.currency)}</p>
            <p className="text-[11px] text-muted-foreground">{flight.currency} · total</p>
          </div>
          <Button asChild size="sm" className="btn-gradient border-0 text-white">
            <Link
              to="/request"
              search={{
                service: "flights",
                from: flight.origin,
                to: flight.destination,
                date: flight.departureTime.slice(0, 10),
              }}
            >
              Select Flight
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function FlightSearch({ compact = false }: { compact?: boolean }) {
  const search = useServerFn(searchFlightOffers);
  const [origin, setOrigin] = useState("LOS");
  const [destination, setDestination] = useState("LHR");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState("1");
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");

  const mutation = useMutation({
    mutationFn: () =>
      search({
        data: {
          origin,
          destination,
          departureDate,
          ...(returnDate ? { returnDate } : {}),
          passengers: { adults: Number(adults) },
          cabinClass,
        },
      }),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  const result = mutation.data;
  const results = result?.ok ? result.results : [];

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="glass-card rounded-[2rem] border border-white/70 p-6 md:p-8"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="flight-from">From</Label>
            <Input
              id="flight-from"
              required
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder="LOS"
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flight-to">To</Label>
            <Input
              id="flight-to"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="LHR"
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flight-depart">Departure date</Label>
            <Input
              id="flight-depart"
              type="date"
              required
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flight-return">Return date (optional)</Label>
            <Input
              id="flight-return"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flight-passengers">Passengers</Label>
            <Select value={adults} onValueChange={setAdults}>
              <SelectTrigger id="flight-passengers">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? "passenger" : "passengers"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="flight-cabin">Cabin class</Label>
            <Select value={cabinClass} onValueChange={(v) => setCabinClass(v as CabinClass)}>
              <SelectTrigger id="flight-cabin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CABIN_CLASSES.map((cabin) => (
                  <SelectItem key={cabin.value} value={cabin.value}>
                    {cabin.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" className="btn-gradient border-0 text-white" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Search Flights
          </Button>
          {compact ? (
            <Button asChild variant="ghost" className="text-navy hover:text-orange">
              <Link to="/flights">
                Open full flight search
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      </form>

      {mutation.isPending ? (
        <div className="space-y-4" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-3xl border border-white/60 bg-white/60"
            />
          ))}
        </div>
      ) : null}

      {!mutation.isPending && mutation.isError ? (
        <div className="flex gap-3 rounded-2xl border border-orange/30 bg-orange-tint p-5 text-sm text-navy">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
          <span>Something went wrong while searching. Please try again in a moment.</span>
        </div>
      ) : null}

      {!mutation.isPending && result && !result.ok ? (
        <div className="flex gap-3 rounded-2xl border border-orange/30 bg-orange-tint p-5 text-sm text-navy">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
          <div>
            <p className="font-semibold">Flight search unavailable</p>
            <p className="mt-1 leading-relaxed">{result.error}</p>
            <p className="mt-2 leading-relaxed">
              You can still{" "}
              <Link to="/request" search={{ service: "flights" }} className="font-semibold underline">
                send a flight request
              </Link>{" "}
              and our team will quote you directly.
            </p>
          </div>
        </div>
      ) : null}

      {!mutation.isPending && result?.ok && results.length === 0 ? (
        <div className="rounded-3xl border border-white/70 bg-white/80 p-8 text-center backdrop-blur-sm">
          <p className="text-base font-bold">No flights found for those details</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try different dates, nearby airports or a different cabin class.
          </p>
        </div>
      ) : null}

      {!mutation.isPending && results.length > 0 ? (
        <div className="space-y-4">
          {results.map((flight) => (
            <FlightCard key={flight.id} flight={flight} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
