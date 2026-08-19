import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BedDouble,
  Check,
  CircleDollarSign,
  CreditCard,
  Hotel,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  TriangleAlert,
} from "lucide-react";

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
import { createVisaHotelReservationRequest } from "@/lib/visa-hotel-reservation.functions";
import {
  getVisaHotelStayRooms,
  prebookHotelStayRate,
  searchHotelStays,
} from "@/lib/travel-api/hotels.functions";
import type { StayInputShape } from "@/lib/travel-api/hotel-stay";
import type { HotelPaymentOption, HotelResult, RoomResult } from "@/lib/travel-api/hotel.types";
import { formatHotelPrice, nightsBetween } from "@/lib/travel-api/hotel-format";
import { VISA_HOTEL_RESERVATION_FEE_NGN } from "@/lib/visa-hotel-reservation";

const RESIDENCIES = [
  { code: "NG", label: "Nigeria" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "UZ", label: "Uzbekistan" },
];

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function eligiblePayment(room: RoomResult): HotelPaymentOption | null {
  return room.paymentOptions.find((option) => option.type === "hotel") ?? null;
}

function eligibleVisaRoom(room: RoomResult): boolean {
  return Boolean(room.bookHash && room.cancellationPolicy.refundable && eligiblePayment(room));
}

function cancellationLabel(room: RoomResult): string {
  if (!room.cancellationPolicy.refundable) return "Non-refundable";
  if (room.cancellationPolicy.freeCancellationUntil) {
    return `Free cancellation until ${new Date(room.cancellationPolicy.freeCancellationUntil).toLocaleString("en-GB")}`;
  }
  return room.cancellationPolicy.description || "Refundable rate";
}

export function VisaHotelReservationSearch({
  initialOrigin = "Nigeria",
  initialDestination = "",
}: {
  initialOrigin?: string;
  initialDestination?: string;
}) {
  const navigate = useNavigate();
  const searchHotels = useServerFn(searchHotelStays);
  const loadVisaRooms = useServerFn(getVisaHotelStayRooms);
  const prebookRate = useServerFn(prebookHotelStayRate);
  const createRequest = useServerFn(createVisaHotelReservationRequest);

  const [destination, setDestination] = useState(initialDestination);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [childAges, setChildAges] = useState<string[]>([]);
  const [nationality, setNationality] = useState("NG");
  const [submittedStay, setSubmittedStay] = useState<StayInputShape | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  const [liveRooms, setLiveRooms] = useState<RoomResult[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomResult | null>(null);
  const [confirmedRoom, setConfirmedRoom] = useState<RoomResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: (stay: StayInputShape) => searchHotels({ data: stay }),
    onSuccess: () => {
      setSelectedHotel(null);
      setLiveRooms([]);
      setSelectedRoom(null);
      setConfirmedRoom(null);
      setActionError(null);
    },
  });

  const roomMutation = useMutation({
    mutationFn: async (hotel: HotelResult) => {
      if (!submittedStay) throw new Error("Please search your stay again.");
      const result = await loadVisaRooms({
        data: { hotelId: hotel.hotelId, stay: submittedStay },
      });
      return { hotel, result };
    },
    onMutate: (hotel) => {
      setSelectedHotel(hotel);
      setLiveRooms([]);
      setSelectedRoom(null);
      setConfirmedRoom(null);
      setActionError(null);
    },
    onSuccess: ({ hotel, result }) => {
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setSelectedHotel(hotel);
      setLiveRooms(result.rooms);
      const eligible = result.rooms.filter(eligibleVisaRoom);
      setActionError(
        eligible.length > 0
          ? null
          : "No refundable pay-at-property room is available at this hotel for these dates. Try another hotel or different dates.",
      );
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "We could not load live bookable rooms.");
    },
  });

  const prebookMutation = useMutation({
    mutationFn: async ({ hotel, room }: { hotel: HotelResult; room: RoomResult }) => {
      if (!room.bookHash) throw new Error("This rate is no longer reservable.");
      const result = await prebookRate({
        data: {
          bookHash: room.bookHash,
          expectedPrice: room.price,
          expectedCurrency: room.currency,
        },
      });
      return { hotel, room, result };
    },
    onSuccess: ({ hotel, result }) => {
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (!eligibleVisaRoom(result.room)) {
        setActionError(
          "This rate changed and no longer meets the visa-reservation rules. Please choose another refundable pay-at-property room.",
        );
        return;
      }
      setSelectedHotel(hotel);
      setSelectedRoom(result.room);
      setConfirmedRoom(result.room);
      setActionError(null);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "We could not confirm this rate.");
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!submittedStay || !selectedHotel || !confirmedRoom || !confirmedRoom.bookHash) {
        throw new Error("Please select and confirm a visa-suitable room first.");
      }
      const payment = eligiblePayment(confirmedRoom);
      if (!payment) throw new Error("The pay-at-property option is no longer available.");
      const nights =
        selectedHotel.nights ?? nightsBetween(submittedStay.checkInDate, submittedStay.checkOutDate);
      return createRequest({
        data: {
          hotelId: selectedHotel.hotelId,
          hotelName: selectedHotel.hotelName,
          hotelImage: selectedHotel.hotelImage ?? null,
          rating: selectedHotel.rating,
          location: selectedHotel.location,
          address: selectedHotel.address,
          checkInDate: selectedHotel.checkInDate ?? submittedStay.checkInDate,
          checkOutDate: selectedHotel.checkOutDate ?? submittedStay.checkOutDate,
          nights: Math.max(1, nights),
          guests: submittedStay.guests.adults + (submittedStay.guests.children ?? 0),
          roomType: confirmedRoom.roomName,
          boardType: confirmedRoom.boardType ?? null,
          cancellationPolicy: cancellationLabel(confirmedRoom),
          hotelPrice: payment.showAmount || confirmedRoom.price,
          hotelCurrency: payment.showCurrency || confirmedRoom.currency,
          bookHash: confirmedRoom.bookHash,
          paymentRequiresCard: payment.requiresCard,
          paymentRequiresCvc: payment.requiresCvc,
          providerPaymentAmount: payment.amount,
          providerPaymentCurrency: payment.currency,
          originCountry: initialOrigin || null,
          destinationCountry: initialDestination || destination,
        },
      });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setActionError(result.message);
        return;
      }
      void navigate({
        to: "/visa-hotel-reservation/travellers/$requestId",
        params: { requestId: result.requestId },
      });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "We could not create this request.");
    },
  });

  const onChildrenChange = (value: string) => {
    setChildren(value);
    const count = Number(value);
    setChildAges((current) => Array.from({ length: count }, (_, i) => current[i] ?? "8"));
  };

  const validate = () => {
    const today = todayISO();
    if (!destination.trim()) return "Enter the city where you need the hotel reservation.";
    if (!checkInDate) return "Choose a check-in date.";
    if (checkInDate < today) return "Check-in date cannot be in the past.";
    if (!checkOutDate || checkOutDate <= checkInDate) return "Check-out must be after check-in.";
    if (childAges.length !== Number(children)) return "Provide the age of every child.";
    return null;
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const error = validate();
    setFormError(error);
    if (error) return;
    const stay: StayInputShape = {
      destination: destination.trim(),
      checkInDate,
      checkOutDate,
      guests: {
        adults: Number(adults),
        children: Number(children),
        childAges: childAges.map(Number),
      },
      rooms: 1,
      nationality,
      currency: "USD",
    };
    setSubmittedStay(stay);
    searchMutation.mutate(stay);
  };

  const results = useMemo(
    () => (searchMutation.data?.ok ? searchMutation.data.results : []),
    [searchMutation.data],
  );
  const visaRooms = useMemo(() => liveRooms.filter(eligibleVisaRoom), [liveRooms]);
  const selectedPayment = confirmedRoom ? eligiblePayment(confirmedRoom) : null;

  return (
    <div className="space-y-8">
      <form onSubmit={submitSearch} className="glass-card rounded-[2rem] border border-white/70 p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange">Step 1</p>
            <h2 className="mt-2 text-2xl font-extrabold text-navy">Find a visa-suitable stay</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              We continue with refundable pay-at-property rates. Some properties require a card guarantee, but the accommodation is not charged by Amazingfly at reservation time.
            </p>
          </div>
          <span className="rounded-2xl bg-mint-tint px-4 py-3 text-sm font-extrabold text-navy">
            Service fee: ₦{VISA_HOTEL_RESERVATION_FEE_NGN.toLocaleString("en-NG")}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="visa-hotel-destination">Destination city</Label>
            <Input
              id="visa-hotel-destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="e.g. London, Paris, Toronto"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visa-hotel-checkin">Check-in</Label>
            <Input
              id="visa-hotel-checkin"
              type="date"
              min={todayISO()}
              value={checkInDate}
              onChange={(event) => setCheckInDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visa-hotel-checkout">Check-out</Label>
            <Input
              id="visa-hotel-checkout"
              type="date"
              min={checkInDate || todayISO()}
              value={checkOutDate}
              onChange={(event) => setCheckOutDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Adults</Label>
            <Select value={adults} onValueChange={setAdults}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <SelectItem key={count} value={String(count)}>{count} adult{count > 1 ? "s" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Children</Label>
            <Select value={children} onValueChange={onChildrenChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((count) => (
                  <SelectItem key={count} value={String(count)}>{count} child{count === 1 ? "" : "ren"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nationality / residency</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESIDENCIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {childAges.map((age, index) => (
            <div className="space-y-2" key={`visa-child-${index}`}>
              <Label>Child {index + 1} age</Label>
              <Select
                value={age}
                onValueChange={(value) =>
                  setChildAges((current) => current.map((item, i) => (i === index ? value : item)))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 18 }, (_, value) => (
                    <SelectItem key={value} value={String(value)}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {formError ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-peach-tint px-4 py-3 text-sm text-navy">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="btn-gradient mt-6 text-white" disabled={searchMutation.isPending}>
          {searchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {searchMutation.isPending ? "Searching live stays…" : "Search eligible hotels"}
        </Button>
      </form>

      {searchMutation.data && !searchMutation.data.ok ? (
        <p className="rounded-2xl bg-peach-tint p-4 text-sm text-navy">{searchMutation.data.error}</p>
      ) : null}

      {results.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange">Step 2</p>
            <h2 className="mt-2 text-2xl font-extrabold text-navy">Choose a hotel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a hotel to load its current bookable pay-at-property rates from the accommodation provider.
            </p>
          </div>
          <div className="grid gap-5">
            {results.map((hotel) => (
              <article key={hotel.hotelId} className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-card md:flex">
                <div className="md:w-64 md:shrink-0">
                  {hotel.hotelImage ? (
                    <img src={hotel.hotelImage} alt={hotel.hotelName} className="h-48 w-full object-cover md:h-full" loading="lazy" />
                  ) : (
                    <div className="grid h-48 place-items-center bg-sky-tint md:h-full"><Hotel className="h-8 w-8 text-orange" /></div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between gap-5 p-5 md:flex-row md:items-center md:p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-navy">{hotel.hotelName}</h3>
                      {hotel.rating > 0 ? (
                        <span className="inline-flex items-center gap-0.5">
                          {Array.from({ length: Math.min(5, Math.round(hotel.rating)) }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-orange text-orange" />
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-orange" /> {hotel.location || hotel.address}
                    </p>
                    <p className="mt-3 text-sm font-bold text-navy">From {formatHotelPrice(hotel.price, hotel.currency)} total</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={roomMutation.isPending && roomMutation.variables?.hotelId === hotel.hotelId}
                    onClick={() => roomMutation.mutate(hotel)}
                  >
                    {roomMutation.isPending && roomMutation.variables?.hotelId === hotel.hotelId ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <BedDouble className="mr-2 h-4 w-4" />
                    )}
                    {roomMutation.isPending && roomMutation.variables?.hotelId === hotel.hotelId
                      ? "Loading bookable rooms…"
                      : "See visa-suitable rooms"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedHotel ? (
        <section className="glass-card rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange">Step 3</p>
              <h2 className="mt-2 text-2xl font-extrabold text-navy">Eligible rooms at {selectedHotel.hotelName}</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-mint-tint px-3 py-1.5 text-xs font-bold text-navy">
              <ShieldCheck className="h-4 w-4" /> Refundable · Pay at property
            </span>
          </div>

          {roomMutation.isPending ? (
            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-sky-tint p-4 text-sm text-navy">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading live bookable rooms…
            </p>
          ) : visaRooms.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-peach-tint p-4 text-sm text-navy">
              No refundable pay-at-property room is available here for these dates. Please choose another hotel or different dates.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {visaRooms.map((room) => {
                const payment = eligiblePayment(room)!;
                const active = selectedRoom?.bookHash === room.bookHash;
                return (
                  <div key={`${room.roomId}-${room.bookHash}`} className={`rounded-2xl border p-5 ${active ? "border-orange bg-peach-tint/40" : "border-white/70 bg-white/75"}`}>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-extrabold text-navy">{room.roomName}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{room.boardType || "Room only"} · {cancellationLabel(room)}</p>
                        <p className="mt-2 text-lg font-extrabold text-navy">{formatHotelPrice(payment.showAmount || room.price, payment.showCurrency || room.currency)}</p>
                        <p className="text-xs text-muted-foreground">Accommodation amount is paid separately according to the property's rate terms.</p>
                        {payment.requiresCard ? (
                          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-navy">
                            <CreditCard className="h-3.5 w-3.5 text-orange" /> Card guarantee required · no hotel debit by Amazingfly now
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        className="btn-gradient text-white"
                        disabled={prebookMutation.isPending}
                        onClick={() => prebookMutation.mutate({ hotel: selectedHotel, room })}
                      >
                        {prebookMutation.isPending && prebookMutation.variables?.room.bookHash === room.bookHash ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Confirm this rate
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {confirmedRoom && selectedHotel && selectedPayment ? (
        <section className="rounded-[2rem] border border-mint/30 bg-mint-tint/60 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold text-navy">
                <ShieldCheck className="h-5 w-5" /> Live rate confirmed
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-navy">Continue with {selectedHotel.hotelName}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Next you will add the traveller names and passport details. The ₦{VISA_HOTEL_RESERVATION_FEE_NGN.toLocaleString("en-NG")} Amazingfly service fee is paid separately and is not credited toward the accommodation cost.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-navy">
                <span className="rounded-full bg-white/80 px-3 py-1.5">Refundable</span>
                <span className="rounded-full bg-white/80 px-3 py-1.5">Pay at property</span>
                <span className="rounded-full bg-white/80 px-3 py-1.5">
                  {selectedPayment.requiresCard ? "Card guarantee required" : "No card guarantee required"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              className="btn-gradient text-white"
              disabled={requestMutation.isPending}
              onClick={() => requestMutation.mutate()}
            >
              {requestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Continue to traveller details
            </Button>
          </div>
        </section>
      ) : null}

      {actionError ? (
        <div className="rounded-2xl border border-orange/30 bg-peach-tint p-4 text-sm text-navy">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
            <div>
              <p>{actionError}</p>
              {actionError.toLowerCase().includes("sign in") ? (
                <Button asChild size="sm" className="mt-3">
                  <Link to="/auth" search={{ redirect: "/visa-hotel-reservation" }}>Sign in to continue</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/75 p-5">
          <ShieldCheck className="h-5 w-5 text-orange" />
          <p className="mt-3 text-sm font-extrabold text-navy">Genuine supplier reservation</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">We use a live accommodation-provider booking flow rather than creating fabricated reservation details.</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/75 p-5">
          <CircleDollarSign className="h-5 w-5 text-orange" />
          <p className="mt-3 text-sm font-extrabold text-navy">Separate ₦15,000 service fee</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">This covers processing and reservation documentation. It is not payment toward the hotel stay.</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/75 p-5">
          <BedDouble className="h-5 w-5 text-orange" />
          <p className="mt-3 text-sm font-extrabold text-navy">Visa-ready documentation</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Once confirmed, your account will provide the reservation details and downloadable documentation for your application file.</p>
        </div>
      </div>
    </div>
  );
}