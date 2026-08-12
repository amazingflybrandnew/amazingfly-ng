import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BedDouble,
  Check,
  Hotel,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
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
import { HotelDetailsModal } from "@/components/HotelDetailsModal";
import { searchHotelStays } from "@/lib/travel-api/hotels.functions";
import type { StayInputShape } from "@/lib/travel-api/hotel-stay";
import type { HotelResult, RoomResult } from "@/lib/travel-api/hotel.types";
import { createHotelRequest } from "@/lib/hotel-request.functions";
import { HotelSearchSkeleton } from "@/components/HotelSearchSkeleton";
import { HotelConfirmation } from "@/components/HotelConfirmation";
import {
  formatHotelPrice,
  nightsBetween,
  perNightPrice,
} from "@/lib/travel-api/hotel-format";



type SortKey = "recommended" | "price" | "rating";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price", label: "Lowest price" },
  { value: "rating", label: "Highest rating" },
];

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "AED"];

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

const formatPrice = formatHotelPrice;

function HotelCard({
  hotel,
  stay,
  onOpen,
  onSelect,
  isSelected,
}: {
  hotel: HotelResult;
  stay: StayInputShape | null;
  onOpen: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const refundable = hotel.rooms.some((room) => room.cancellationPolicy.refundable);
  const nights =
    hotel.nights ??
    nightsBetween(hotel.checkInDate ?? stay?.checkInDate, hotel.checkOutDate ?? stay?.checkOutDate);
  const nightly = perNightPrice(hotel.price, nights);
  const roomCount = hotel.rooms.length;

  return (
    <article
      className={`group overflow-hidden rounded-3xl border bg-white/80 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        isSelected ? "border-orange ring-2 ring-orange/30" : "border-white/70 hover:border-orange/40"
      }`}
    >
      <div className="flex flex-col md:flex-row">
        <div className="relative overflow-hidden md:w-72 md:shrink-0">
          {hotel.hotelImage ? (
            <img
              src={hotel.hotelImage}
              alt={hotel.hotelName}
              loading="lazy"
              className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105 md:h-full"
            />
          ) : (
            <div className="grid h-52 w-full place-items-center bg-gradient-to-br from-sky-tint to-lavender-tint md:h-full">
              <Hotel className="h-8 w-8 text-orange" aria-hidden="true" />
            </div>
          )}
          {refundable ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-navy shadow-sm backdrop-blur">
              <Check className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
              Free cancellation
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-navy">{hotel.hotelName}</h3>
              {hotel.rating ? (
                <span className="inline-flex items-center gap-0.5" aria-label={`${hotel.rating} star hotel`}>
                  {Array.from({ length: Math.min(5, Math.round(hotel.rating)) }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-orange text-orange" aria-hidden="true" />
                  ))}
                </span>
              ) : null}
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
              <span className="min-w-0 truncate">{hotel.location || hotel.address}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {hotel.reviewScore ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-mint-tint px-2.5 py-1 text-xs font-semibold text-navy">
                  <span className="rounded-md bg-white/70 px-1.5 py-0.5 font-extrabold">
                    {hotel.reviewScore}
                  </span>
                  Guest rating
                  {hotel.reviewCount ? ` · ${hotel.reviewCount} reviews` : ""}
                </span>
              ) : null}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-navy ${
                  roomCount > 0 ? "bg-sky-tint" : "bg-peach-tint"
                }`}
              >
                <BedDouble className="h-3.5 w-3.5 text-orange" aria-hidden="true" />
                {roomCount > 0
                  ? `${roomCount} room option${roomCount > 1 ? "s" : ""} available`
                  : "Availability on request"}
              </span>
            </div>
            {hotel.amenities.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {hotel.amenities.slice(0, 5).map((amenity) => (
                  <li
                    key={amenity}
                    className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {amenity}
                  </li>
                ))}
                {hotel.amenities.length > 5 ? (
                  <li className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-orange">
                    +{hotel.amenities.length - 5} more
                  </li>
                ) : null}
              </ul>
            ) : null}
            {hotel.rooms[0] ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Lowest room: {hotel.rooms[0].roomName}
                {hotel.rooms[0].boardType ? ` · ${hotel.rooms[0].boardType}` : ""}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
            <div className="md:text-right">
              <p className="text-xl font-extrabold text-navy">
                {formatPrice(nightly, hotel.currency)}
                <span className="text-xs font-semibold text-muted-foreground"> / night</span>
              </p>
              <p className="text-sm font-semibold text-navy-soft">
                {formatPrice(hotel.price, hotel.currency)} total
              </p>
              <p className="text-[11px] text-muted-foreground">
                {nights > 0 ? `${nights} night${nights > 1 ? "s" : ""} · ` : ""}
                {hotel.currency} · taxes as quoted
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 md:w-auto">
              <Button size="sm" variant="secondary" className="flex-1 md:flex-none" onClick={onOpen}>
                View Details
              </Button>
              <Button
                size="sm"
                className="btn-gradient flex-1 border-0 text-white md:flex-none"
                onClick={onSelect}
              >
                {isSelected ? (
                  <>
                    <Check className="mr-1 h-4 w-4" aria-hidden="true" /> Selected
                  </>
                ) : (
                  "Select Hotel"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function HotelSearch({ compact = false }: { compact?: boolean }) {
  const search = useServerFn(searchHotelStays);

  const [destination, setDestination] = useState("Dubai");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [rooms, setRooms] = useState("1");
  const [currency, setCurrency] = useState("NGN");
  const [formError, setFormError] = useState<string | null>(null);

  const [submittedStay, setSubmittedStay] = useState<StayInputShape | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState("any");
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [refundableOnly, setRefundableOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [detailHotel, setDetailHotel] = useState<HotelResult | null>(null);
  const [selected, setSelected] = useState<HotelResult | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomResult | null>(null);

  const createRequestFn = useServerFn(createHotelRequest);
  const createRequest = useMutation({
    mutationFn: ({ hotel, room }: { hotel: HotelResult; room: RoomResult | null }) =>
      createRequestFn({
        data: {
          hotelId: hotel.hotelId,
          hotelName: hotel.hotelName,
          hotelImage: hotel.hotelImage ?? null,
          rating: hotel.rating,
          location: hotel.location,
          address: hotel.address,
          checkInDate: hotel.checkInDate ?? submittedStay?.checkInDate ?? "",
          checkOutDate: hotel.checkOutDate ?? submittedStay?.checkOutDate ?? "",
          nights: hotel.nights ?? null,
          guests:
            (submittedStay?.guests.adults ?? 1) + (submittedStay?.guests.children ?? 0),
          rooms: submittedStay?.rooms ?? 1,
          roomType: room?.roomName ?? null,
          boardType: room?.boardType ?? null,
          cancellationPolicy: room
            ? room.cancellationPolicy.refundable
              ? `Free cancellation${
                  room.cancellationPolicy.freeCancellationUntil
                    ? ` until ${room.cancellationPolicy.freeCancellationUntil}`
                    : ""
                }`
              : "Non-refundable"
            : null,
          price: room?.price ?? hotel.price,
          currency: room?.currency ?? hotel.currency,
        },
      }),
  });


  const mutation = useMutation({
    mutationFn: (stay: StayInputShape) => search({ data: stay }),
    onSuccess: () => {
      setSortKey("recommended");
      setMinRating("any");
      setAmenityFilter([]);
      setRefundableOnly(false);
      setMaxPrice(null);
    },
  });

  function validate(): string | null {
    const today = todayISO();
    if (!destination.trim()) return "Please tell us where you would like to stay.";
    if (!checkInDate) return "Please choose a check-in date.";
    if (checkInDate < today) return "Check-in date cannot be in the past.";
    if (!checkOutDate) return "Please choose a check-out date.";
    if (checkOutDate <= checkInDate) return "Check-out must be after the check-in date.";
    if (Number(rooms) < 1) return "Please select at least one room.";
    if (Number(adults) < 1) return "Please select at least one adult guest.";
    return null;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const error = validate();
    setFormError(error);
    if (error) return;
    const stay: StayInputShape = {
      destination: destination.trim(),
      checkInDate,
      checkOutDate,
      guests: { adults: Number(adults), children: Number(children) },
      rooms: Number(rooms),
      nationality: "NG",
      currency,
    };
    setSubmittedStay(stay);
    mutation.mutate(stay);
  };

  const result = mutation.data;
  const results = useMemo(() => (result?.ok ? result.results : []), [result]);

  const amenities = useMemo(
    () =>
      Array.from(new Set(results.flatMap((hotel) => hotel.amenities)))
        .sort()
        .slice(0, 18),
    [results],
  );

  const priceBounds = useMemo(() => {
    if (results.length === 0) return { min: 0, max: 0 };
    const prices = results.map((hotel) => hotel.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [results]);

  const visible = useMemo(() => {
    const ratingFloor = minRating === "any" ? 0 : Number(minRating);
    const priceLimit = maxPrice ?? priceBounds.max;
    const filtered = results.filter(
      (hotel) =>
        hotel.rating >= ratingFloor &&
        (priceBounds.max === 0 || hotel.price <= priceLimit) &&
        (amenityFilter.length === 0 ||
          amenityFilter.every((amenity) => hotel.amenities.includes(amenity))) &&
        (!refundableOnly || hotel.rooms.some((room) => room.cancellationPolicy.refundable)),
    );

    const sorted = [...filtered];
    switch (sortKey) {
      case "price":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating || a.price - b.price);
        break;
      default: {
        const maxP = Math.max(...filtered.map((h) => h.price), 1);
        sorted.sort(
          (a, b) => a.price / maxP - a.rating * 0.12 - (b.price / maxP - b.rating * 0.12),
        );
      }
    }
    return sorted;
  }, [results, minRating, maxPrice, priceBounds.max, amenityFilter, refundableOnly, sortKey]);

  const toggleAmenity = (amenity: string) =>
    setAmenityFilter((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    );

  const resetFilters = () => {
    setMinRating("any");
    setAmenityFilter([]);
    setRefundableOnly(false);
    setMaxPrice(null);
  };

  const handleSelect = (hotel: HotelResult, room?: RoomResult) => {
    const chosen = room ?? hotel.rooms[0] ?? null;
    setSelected(hotel);
    setSelectedRoom(chosen);
    setDetailHotel(null);
    createRequest.reset();
    prebook.reset();
    if (!submittedStay) return;
    if (!chosen?.roomId) {
      createRequest.mutate({ hotel, room: chosen });
      return;
    }
    prebook.mutate({ hotel, room: chosen });
  };

  const confirmNewPrice = () => {
    if (!selected || !selectedRoom) return;
    createRequest.mutate({ hotel: selected, room: selectedRoom });
  };




  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        noValidate
        className="glass-card rounded-[2rem] border border-white/70 p-6 md:p-8"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="hotel-destination">Destination</Label>
            <Input
              id="hotel-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="City, area or hotel"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hotel-checkin">Check-in</Label>
            <Input
              id="hotel-checkin"
              type="date"
              min={todayISO()}
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hotel-checkout">Check-out</Label>
            <Input
              id="hotel-checkout"
              type="date"
              min={checkInDate || todayISO()}
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hotel-adults">Guests</Label>
            <Select value={adults} onValueChange={setAdults}>
              <SelectTrigger id="hotel-adults">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} adult{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hotel-children">Children</Label>
            <Select value={children} onValueChange={setChildren}>
              <SelectTrigger id="hotel-children">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} child{n === 1 ? "" : "ren"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hotel-rooms">Rooms</Label>
            <Select value={rooms} onValueChange={setRooms}>
              <SelectTrigger id="hotel-rooms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} room{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hotel-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="hotel-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
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
          <Button
            type="submit"
            size="lg"
            className="btn-gradient border-0 text-white"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Search Hotels
          </Button>
          {compact ? (
            <Button asChild variant="ghost" className="text-navy hover:text-orange">
              <Link to="/hotels">
                Open full hotel search
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      </form>

      {selected ? (
        <HotelConfirmation hotel={selected} room={selectedRoom} stay={submittedStay}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {createRequest.isPending ? (
                <span className="flex items-center gap-2 text-sm font-semibold text-navy-soft">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving this stay to your account…
                </span>
              ) : createRequest.data?.ok ? (
                <Button asChild size="sm" className="btn-gradient border-0 text-white">
                  <Link
                    to="/booking-review/$requestId"
                    params={{ requestId: createRequest.data.requestId }}
                  >
                    Review booking
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>

              ) : createRequest.data &&
                !createRequest.data.ok &&
                createRequest.data.reason === "auth" ? (
                <Button asChild size="sm" className="btn-gradient border-0 text-white">
                  <Link to="/auth" search={{ redirect: "/hotels" }}>
                    Sign in to save this stay
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="btn-gradient border-0 text-white">
                  <Link to="/request" search={{ service: "hotels", to: selected.location }}>
                    Continue with this hotel
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setDetailHotel(selected)}
              >
                Change room
              </Button>
            </div>

            {createRequest.data?.ok ? (
              <p className="rounded-2xl bg-mint-tint px-4 py-3 text-sm text-navy">
                Hotel request <strong>{createRequest.data.reference}</strong> created. Status: New
                Request — our specialists will confirm availability and come back to you.
              </p>
            ) : null}
            {createRequest.data && !createRequest.data.ok ? (
              <p className="rounded-2xl bg-peach-tint px-4 py-3 text-sm text-navy">
                {createRequest.data.message}
              </p>
            ) : null}
          </div>
        </HotelConfirmation>
      ) : null}

      {mutation.isPending ? <HotelSearchSkeleton /> : null}

      {result && !result.ok ? (
        <p className="flex gap-2 rounded-2xl border border-orange/30 bg-orange-tint p-4 text-sm text-navy">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
          {result.error}
        </p>
      ) : null}

      {result?.ok && results.length === 0 ? (
        <p className="rounded-2xl border border-white/70 bg-white/70 p-6 text-sm text-muted-foreground">
          No stays matched this search. Try different dates or another destination — or send us a
          request and our team will find options for you.
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {visible.length} of {results.length} stays
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-52" aria-label="Sort hotels">
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
                Filters
              </Button>
            </div>
          </div>

          {showFilters ? (
            <div className="grid gap-6 rounded-3xl border border-white/70 bg-white/70 p-6 backdrop-blur-sm md:grid-cols-3">
              <div className="space-y-3">
                <Label>Star rating</Label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any rating</SelectItem>
                    <SelectItem value="3">3 stars and above</SelectItem>
                    <SelectItem value="4">4 stars and above</SelectItem>
                    <SelectItem value="5">5 stars only</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={refundableOnly}
                    onCheckedChange={(checked) => setRefundableOnly(checked === true)}
                  />
                  Free cancellation only
                </label>
              </div>

              <div className="space-y-3">
                <Label>
                  Max total price:{" "}
                  {formatPrice(maxPrice ?? priceBounds.max, results[0]?.currency ?? "NGN")}
                </Label>
                <Slider
                  min={priceBounds.min}
                  max={Math.max(priceBounds.max, priceBounds.min + 1)}
                  step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 50))}
                  value={[maxPrice ?? priceBounds.max]}
                  onValueChange={(value) => setMaxPrice(value[0] ?? priceBounds.max)}
                />
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              </div>

              <div className="space-y-3">
                <Label>Amenities</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto pr-2">
                  {amenities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No amenity data available.</p>
                  ) : (
                    amenities.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={amenityFilter.includes(amenity)}
                          onCheckedChange={() => toggleAmenity(amenity)}
                        />
                        {amenity}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-5">
            {visible.map((hotel) => (
              <HotelCard
                key={hotel.hotelId}
                hotel={hotel}
                stay={submittedStay}
                onOpen={() => setDetailHotel(hotel)}
                onSelect={() => handleSelect(hotel)}
                isSelected={selected?.hotelId === hotel.hotelId}
              />
            ))}
            {visible.length === 0 ? (
              <p className="rounded-2xl border border-white/70 bg-white/70 p-6 text-sm text-muted-foreground">
                No stays match your filters.{" "}
                <button type="button" className="font-semibold text-orange" onClick={resetFilters}>
                  Reset filters
                </button>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <HotelDetailsModal
        hotel={detailHotel}
        stay={submittedStay}
        onClose={() => setDetailHotel(null)}
        onSelect={handleSelect}
      />

      {!result && !mutation.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BedDouble className="h-4 w-4 text-orange" aria-hidden="true" />
          Enter your destination and dates to see available stays.
        </p>
      ) : null}
    </div>
  );
}
