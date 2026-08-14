import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BedDouble,
  Check,
  Info,
  Loader2,
  MapPin,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getHotelStayDetails } from "@/lib/travel-api/hotels.functions";
import type { HotelResult, RoomResult } from "@/lib/travel-api/hotel.types";
import type { StayInputShape } from "@/lib/travel-api/hotel-stay";
import {
  describeCancellation,
  formatHotelPrice,
  formatStayDate,
  nightsBetween,
  perNightPrice,
} from "@/lib/travel-api/hotel-format";

function RoomCard({
  room,
  nights,
  onSelect,
}: {
  room: RoomResult;
  nights: number;
  onSelect: () => void;
}) {
  return (
    <li className="flex h-full flex-col gap-3 rounded-2xl border border-white/70 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-card">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-navy">{room.roomName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {[room.roomType, room.bedType].filter(Boolean).join(" · ") || "Room details on request"}
        </p>
      </div>

      <ul className="space-y-1.5 text-xs">
        <li className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0 text-orange" aria-hidden="true" />
          Sleeps {room.capacity}
        </li>
        <li className="flex items-center gap-1.5 text-muted-foreground">
          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-orange" aria-hidden="true" />
          {room.boardType || "Room only"}
        </li>
        <li className="flex items-start gap-1.5">
          {room.cancellationPolicy.refundable ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
          ) : (
            <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange" aria-hidden="true" />
          )}
          <span
            className={
              room.cancellationPolicy.refundable ? "text-navy" : "text-muted-foreground"
            }
          >
            {describeCancellation(
              room.cancellationPolicy.refundable,
              room.cancellationPolicy.freeCancellationUntil,
            )}
          </span>
        </li>
      </ul>

      <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="text-base font-extrabold text-navy">
            {formatHotelPrice(room.price, room.currency)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {nights > 0
              ? `${formatHotelPrice(perNightPrice(room.price, nights), room.currency)} / night`
              : "Total stay"}
          </p>
        </div>
        <Button size="sm" variant="secondary" className="shrink-0" onClick={onSelect}>
          Select Room
        </Button>
      </div>
    </li>
  );
}

export function HotelDetailsModal({
  hotel,
  stay,
  onClose,
  onSelect,
}: {
  hotel: HotelResult | null;
  stay: StayInputShape | null;
  onClose: () => void;
  onSelect: (hotel: HotelResult, room?: RoomResult) => void;
}) {
  const fetchDetails = useServerFn(getHotelStayDetails);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const details = useMutation({
    mutationFn: (input: { hotelId: string; stay: StayInputShape }) =>
      fetchDetails({ data: input }),
  });

  useEffect(() => {
    if (hotel && stay && hotel.hotelId !== hotelId) {
      setHotelId(hotel.hotelId);
      setActiveImage(0);
      details.mutate({ hotelId: hotel.hotelId, stay });
    }
    if (!hotel) setHotelId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel, stay]);

  if (!hotel) return null;

  const payload = details.data?.ok ? details.data : null;
  const full = payload?.hotel ?? null;
  // Only live hotelpage (/search/hp/) rates may be selected — never fall back
  // to the SERP rates carried on the search result.
  const rooms = (payload?.rooms ?? []).filter((room) => Boolean(room.bookHash));
  const images = (full?.images?.length ? full.images : (hotel.images ?? [])).filter(Boolean);
  const gallery = images.length ? images : hotel.hotelImage ? [hotel.hotelImage] : [];
  const amenities = full?.amenities?.length ? full.amenities : hotel.amenities;
  const nights =
    hotel.nights ??
    nightsBetween(hotel.checkInDate ?? stay?.checkInDate, hotel.checkOutDate ?? stay?.checkOutDate);
  const lowest = rooms.length
    ? rooms.reduce((min, room) => (room.price < min.price ? room : min), rooms[0]!)
    : null;
  const totalPrice = lowest?.price ?? hotel.price;
  const currency = lowest?.currency ?? hotel.currency;

  return (
    <Dialog open={Boolean(hotel)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto rounded-[1.5rem] border-white/70 bg-white/92 p-4 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-extrabold sm:text-2xl">
            {hotel.hotelName}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
              <span className="min-w-0">{full?.address || hotel.address || hotel.location}</span>
            </span>
            {hotel.rating ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                <Star className="h-4 w-4 fill-orange text-orange" aria-hidden="true" />
                {hotel.rating}-star
              </span>
            ) : null}
            {hotel.reviewScore ? (
              <span className="shrink-0 rounded-full bg-mint-tint px-2.5 py-0.5 text-xs font-semibold text-navy">
                {hotel.reviewScore}/10 guest rating
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {gallery.length ? (
          <div className="space-y-2">
            <img
              src={gallery[Math.min(activeImage, gallery.length - 1)]}
              alt={hotel.hotelName}
              loading="lazy"
              className="h-52 w-full rounded-2xl object-cover sm:h-72"
            />
            {gallery.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gallery.slice(0, 12).map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`View photo ${index + 1}`}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      index === activeImage ? "border-orange" : "border-transparent opacity-75"
                    }`}
                  >
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {details.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading hotel details…
          </p>
        ) : null}

        <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/70 p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Check-in
            </p>
            <p className="font-bold text-navy">
              {formatStayDate(hotel.checkInDate ?? stay?.checkInDate)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Check-out
            </p>
            <p className="font-bold text-navy">
              {formatStayDate(hotel.checkOutDate ?? stay?.checkOutDate)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Stay
            </p>
            <p className="font-bold text-navy">
              {nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : "Dates to confirm"} ·{" "}
              {stay?.rooms ?? 1} room{(stay?.rooms ?? 1) > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {full?.description ? (
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy">About this hotel</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {full.description.slice(0, 1200)}
            </p>
          </section>
        ) : null}

        <section>
          <h3 className="text-sm font-bold uppercase tracking-wide text-navy">Address</h3>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
            {full?.address || hotel.address || hotel.location}
          </p>
        </section>

        {amenities.length ? (
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy">Amenities</h3>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.slice(0, 24).map((amenity) => (
                <li
                  key={amenity}
                  className="flex items-center gap-2 rounded-xl bg-sky-tint px-3 py-2 text-xs font-medium text-navy"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-orange" aria-hidden="true" />
                  <span className="min-w-0 truncate">{amenity}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="text-sm font-bold uppercase tracking-wide text-navy">
            Compare room options
            {rooms.length ? (
              <span className="ml-2 font-medium normal-case text-muted-foreground">
                {rooms.length} rate{rooms.length > 1 ? "s" : ""} available
              </span>
            ) : null}
          </h3>
          {rooms.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {details.isPending
                ? "Loading live rates for these dates…"
                : "No live rates are available for these dates right now. Please try different dates."}
            </p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {rooms.map((room, i) => (
                <RoomCard
                  key={`${room.roomId}-${i}`}
                  room={room}
                  nights={nights}
                  onSelect={() => onSelect(hotel, room)}
                />
              ))}
            </ul>
          )}
        </section>

        {full?.policies ? (
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy">Hotel policies</h3>
            <p className="mt-2 flex gap-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
              {full.policies.slice(0, 800)}
            </p>
          </section>
        ) : null}

        <div className="sticky bottom-0 -mx-4 mt-2 grid gap-3 border-t border-border bg-white/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Total stay from
            </p>
            <p className="text-xl font-extrabold text-navy sm:text-2xl">
              {formatHotelPrice(totalPrice, currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {nights > 0
                ? `${formatHotelPrice(perNightPrice(totalPrice, nights), currency)} / night · ${nights} night${nights > 1 ? "s" : ""} · `
                : ""}
              {currency}
            </p>
          </div>
          <Button
            className="btn-gradient w-full border-0 text-white sm:w-auto"
            disabled={!lowest}
            onClick={() => (lowest ? onSelect(hotel, lowest) : undefined)}
          >
            <BedDouble className="mr-2 h-4 w-4" aria-hidden="true" />
            {lowest ? "Select Hotel" : "Choose a live rate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
