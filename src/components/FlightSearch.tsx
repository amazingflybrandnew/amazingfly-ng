import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Loader2,
  PlaneTakeoff,
  Search,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlightDetailsModal } from "@/components/FlightDetailsModal";
import { searchFlightOffers } from "@/lib/travel-api/flights.functions";
import { CABIN_CLASSES, type CabinClass, type FlightResult } from "@/lib/travel-api/flight.types";
import { selectFlight, useSelectedFlight } from "@/lib/travel-api/selected-flight";
import { createFlightRequest } from "@/lib/flight-request.functions";

type SortKey = "recommended" | "price" | "duration" | "stops";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price", label: "Lowest price" },
  { value: "duration", label: "Shortest duration" },
  { value: "stops", label: "Fewest stops" },
];

const STOP_FILTERS: { value: string; label: string }[] = [
  { value: "any", label: "Any number of stops" },
  { value: "0", label: "Non-stop only" },
  { value: "1", label: "Up to 1 stop" },
  { value: "2", label: "Up to 2 stops" },
];

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

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function FlightCard({
  flight,
  onOpen,
  onSelect,
  isSelected,
}: {
  flight: FlightResult;
  onOpen: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`hover-lift cursor-pointer rounded-3xl border bg-white/80 p-6 shadow-card backdrop-blur-sm transition ${
        isSelected ? "border-orange ring-2 ring-orange/30" : "border-white/70"
      }`}
    >
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
          <Button
            size="sm"
            className="btn-gradient border-0 text-white"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            {isSelected ? (
              <>
                <Check className="mr-1 h-4 w-4" aria-hidden="true" /> Selected
              </>
            ) : (
              "Select Flight"
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function FlightSearch({ compact = false }: { compact?: boolean }) {
  const search = useServerFn(searchFlightOffers);
  const selected = useSelectedFlight();
  const createRequestFn = useServerFn(createFlightRequest);

  const createRequest = useMutation({
    mutationFn: (flight: FlightResult) =>
      createRequestFn({
        data: {
          offerId: flight.id,
          airline: flight.airline,
          airlineLogoUrl: flight.airlineLogoUrl ?? null,
          flightNumber: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          duration: flight.duration,
          stops: flight.stops,
          cabinClass: flight.cabinClass,
          passengers: flight.passengers.adults,
          price: flight.price,
          currency: flight.currency,
        },
      }),
  });

  const handleSelect = (flight: FlightResult) => {
    selectFlight(flight);
    createRequest.mutate(flight);
  };

  const [origin, setOrigin] = useState("LOS");
  const [destination, setDestination] = useState("LHR");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState("1");
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");
  const [formError, setFormError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [airlineFilter, setAirlineFilter] = useState<string[]>([]);
  const [stopsFilter, setStopsFilter] = useState("any");
  const [cabinFilter, setCabinFilter] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [detailFlight, setDetailFlight] = useState<FlightResult | null>(null);

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
    onSuccess: () => {
      setAirlineFilter([]);
      setStopsFilter("any");
      setCabinFilter("all");
      setMaxPrice(null);
      setSortKey("recommended");
    },
  });

  function validate(): string | null {
    const today = todayISO();
    if (!origin.trim()) return "Please tell us which city or airport you are flying from.";
    if (!destination.trim()) return "Please tell us where you are flying to.";
    if (origin.trim().toUpperCase() === destination.trim().toUpperCase())
      return "Your departure and destination cannot be the same place.";
    if (!departureDate) return "Please choose a departure date.";
    if (departureDate < today) return "Departure date cannot be in the past.";
    if (returnDate && returnDate < departureDate)
      return "Your return date must be on or after the departure date.";
    const passengerCount = Number(adults);
    if (!passengerCount || passengerCount < 1)
      return "Please select at least one passenger.";
    return null;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const error = validate();
    setFormError(error);
    if (error) return;
    mutation.mutate();
  };

  const result = mutation.data;
  const results = useMemo(() => (result?.ok ? result.results : []), [result]);

  const airlines = useMemo(
    () => Array.from(new Set(results.map((f) => f.airline))).sort(),
    [results],
  );
  const cabins = useMemo(
    () => Array.from(new Set(results.map((f) => f.cabinClass))).sort(),
    [results],
  );
  const priceBounds = useMemo(() => {
    if (results.length === 0) return { min: 0, max: 0 };
    const prices = results.map((f) => f.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [results]);

  const visible = useMemo(() => {
    const stopLimit = stopsFilter === "any" ? Infinity : Number(stopsFilter);
    const priceLimit = maxPrice ?? priceBounds.max;
    const filtered = results.filter(
      (flight) =>
        (airlineFilter.length === 0 || airlineFilter.includes(flight.airline)) &&
        flight.stops <= stopLimit &&
        (cabinFilter === "all" || flight.cabinClass === cabinFilter) &&
        (priceBounds.max === 0 || flight.price <= priceLimit),
    );

    const scored = [...filtered];
    switch (sortKey) {
      case "price":
        scored.sort((a, b) => a.price - b.price);
        break;
      case "duration":
        scored.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case "stops":
        scored.sort((a, b) => a.stops - b.stops || a.price - b.price);
        break;
      default: {
        const maxP = Math.max(...filtered.map((f) => f.price), 1);
        const maxD = Math.max(...filtered.map((f) => f.durationMinutes), 1);
        scored.sort(
          (a, b) =>
            (a.price / maxP + a.durationMinutes / maxD + a.stops * 0.15) -
            (b.price / maxP + b.durationMinutes / maxD + b.stops * 0.15),
        );
      }
    }
    return scored;
  }, [results, airlineFilter, stopsFilter, cabinFilter, maxPrice, priceBounds.max, sortKey]);

  const toggleAirline = (airline: string) =>
    setAirlineFilter((prev) =>
      prev.includes(airline) ? prev.filter((a) => a !== airline) : [...prev, airline],
    );

  const resetFilters = () => {
    setAirlineFilter([]);
    setStopsFilter("any");
    setCabinFilter("all");
    setMaxPrice(null);
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        noValidate
        className="glass-card rounded-[2rem] border border-white/70 p-6 md:p-8"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="flight-from">From</Label>
            <Input
              id="flight-from"
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
              min={todayISO()}
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flight-return">Return date (optional)</Label>
            <Input
              id="flight-return"
              type="date"
              min={departureDate || todayISO()}
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

        {formError ? (
          <p
            role="alert"
            className="mt-4 flex gap-2 rounded-2xl border border-orange/30 bg-orange-tint p-4 text-sm text-navy"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
            {formError}
          </p>
        ) : null}

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

      {selected ? (
        <div className="space-y-3 rounded-3xl border border-orange/30 bg-white/80 p-5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-bold">
                Selected: {selected.airline} · {selected.origin} → {selected.destination}
              </p>
              <p className="text-muted-foreground">
                {formatDate(selected.departureTime)} · {selected.duration} ·{" "}
                {formatPrice(selected.price, selected.currency)}
              </p>
            </div>
            {createRequest.isPending ? (
              <span className="flex items-center gap-2 text-sm font-semibold text-navy-soft">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving this flight to your account…
              </span>
            ) : createRequest.data?.ok ? (
              <Button asChild size="sm" className="btn-gradient border-0 text-white">
                <Link to="/dashboard">
                  View my flight requests
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : createRequest.data && !createRequest.data.ok && createRequest.data.reason === "auth" ? (
              <Button asChild size="sm" className="btn-gradient border-0 text-white">
                <Link to="/auth" search={{ redirect: "/flights" }}>
                  Sign in to save this flight
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="btn-gradient border-0 text-white">
                <Link
                  to="/request"
                  search={{ service: "flights", from: selected.origin, to: selected.destination }}
                >
                  Continue with this flight
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>

          {createRequest.data?.ok ? (
            <p className="rounded-2xl bg-mint-tint px-4 py-3 text-sm text-navy">
              Flight request <strong>{createRequest.data.reference}</strong> created. Status: New
              Request — our specialists will review it and come back to you.
            </p>
          ) : null}
          {createRequest.data && !createRequest.data.ok ? (
            <p className="rounded-2xl bg-peach-tint px-4 py-3 text-sm text-navy">
              {createRequest.data.message}
            </p>
          ) : null}
        </div>
      ) : null}

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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/70 p-4 backdrop-blur-sm">
            <p className="text-sm font-semibold">
              {visible.length} of {results.length} flight{results.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal className="mr-1 h-4 w-4" aria-hidden="true" />
                Filters
              </Button>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-48" aria-label="Sort flights">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showFilters ? (
            <div className="grid gap-6 rounded-3xl border border-white/70 bg-white/80 p-6 backdrop-blur-sm md:grid-cols-3">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Airlines
                </p>
                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {airlines.map((airline) => (
                    <label key={airline} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={airlineFilter.includes(airline)}
                        onCheckedChange={() => toggleAirline(airline)}
                      />
                      {airline}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Stops
                  </p>
                  <Select value={stopsFilter} onValueChange={setStopsFilter}>
                    <SelectTrigger aria-label="Filter by stops">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STOP_FILTERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cabin class
                  </p>
                  <Select value={cabinFilter} onValueChange={setCabinFilter}>
                    <SelectTrigger aria-label="Filter by cabin class">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cabins</SelectItem>
                      {cabins.map((cabin) => (
                        <SelectItem key={cabin} value={cabin}>
                          {cabin.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Maximum price
                </p>
                <Slider
                  value={[maxPrice ?? priceBounds.max]}
                  min={priceBounds.min}
                  max={Math.max(priceBounds.max, priceBounds.min + 1)}
                  step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 50) || 1)}
                  onValueChange={(value) => setMaxPrice(value[0] ?? priceBounds.max)}
                  aria-label="Maximum price"
                />
                <p className="text-sm font-semibold">
                  Up to{" "}
                  {formatPrice(maxPrice ?? priceBounds.max, results[0]?.currency ?? "NGN")}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              </div>
            </div>
          ) : null}

          {visible.length === 0 ? (
            <div className="rounded-3xl border border-white/70 bg-white/80 p-8 text-center backdrop-blur-sm">
              <p className="text-base font-bold">No flights match your filters</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try widening the price range or allowing more stops.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  isSelected={selected?.id === flight.id}
                  onOpen={() => setDetailFlight(flight)}
                  onSelect={() => handleSelect(flight)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <FlightDetailsModal
        flight={detailFlight}
        open={detailFlight !== null}
        onOpenChange={(open) => {
          if (!open) setDetailFlight(null);
        }}
        isSelected={selected?.id === detailFlight?.id}
        onSelect={(flight) => {
          handleSelect(flight);
          setDetailFlight(null);
        }}
      />
    </div>
  );
}
