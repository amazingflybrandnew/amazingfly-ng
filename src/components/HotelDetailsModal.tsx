import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BedDouble, Loader2, MapPin, Star, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getHotelStayDetails } from "@/lib/travel-api/hotels.functions";
import type { HotelResult } from "@/lib/travel-api/hotel.types";
import type { StayInputShape } from "@/lib/travel-api/hotel-stay";

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

export function HotelDetailsModal({
  hotel,
  stay,
  onClose,
  onSelect,
}: {
  hotel: HotelResult | null;
  stay: StayInputShape | null;
  onClose: () => void;
  onSelect: (hotel: HotelResult) => void;
}) {
  const fetchDetails = useServerFn(getHotelStayDetails);
  const [hotelId, setHotelId] = useState<string | null>(null);

  const details = useMutation({
    mutationFn: (input: { hotelId: string; stay: StayInputShape }) =>
      fetchDetails({ data: input }),
  });

  useEffect(() => {
    if (hotel && stay && hotel.hotelId !== hotelId) {
      setHotelId(hotel.hotelId);
      details.mutate({ hotelId: hotel.hotelId, stay });
    }
    if (!hotel) setHotelId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel, stay]);

  if (!hotel) return null;

  const payload = details.data?.ok ? details.data : null;
  const full = payload?.hotel ?? null;
  const rooms = payload?.rooms?.length ? payload.rooms : hotel.rooms;
  const images = (full?.images?.length ? full.images : hotel.images ?? []).slice(0, 6);
  const amenities = full?.amenities?.length ? full.amenities : hotel.amenities;

  return (
    <Dialog open={Boolean(hotel)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[1.75rem] border-white/70 bg-white/90 backdrop-blur-xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">{hotel.hotelName}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-orange" aria-hidden="true" />
              {full?.address || hotel.address || hotel.location}
            </span>
            {hotel.rating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-orange text-orange" aria-hidden="true" />
                {hotel.rating}-star
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {images.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((src) => (
              <img
                key={src}
                src={src}
                alt={hotel.hotelName}
                loading="lazy"
                className="h-28 w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        ) : null}

        {details.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading hotel details…
          </p>
        ) : null}

        {full?.description ? (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy">About</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {full.description.slice(0, 1200)}
            </p>
          </div>
        ) : null}

        {amenities.length ? (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy">Amenities</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {amenities.slice(0, 24).map((amenity) => (
                <li
                  key={amenity}
                  className="rounded-full bg-sky-tint px-3 py-1 text-xs font-medium text-navy"
                >
                  {amenity}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-navy">Room options</h3>
          <ul className="mt-3 space-y-3">
            {rooms.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Room options will be confirmed by our team for these dates.
              </li>
            ) : (
              rooms.slice(0, 10).map((room) => (
                <li
                  key={room.roomId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/70 p-4"
                >
                  <div className="text-sm">
                    <p className="font-bold">{room.roomName}</p>
                    <p className="text-muted-foreground">
                      {[room.bedType, room.boardType, `Sleeps ${room.capacity}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs">
                      {room.cancellationPolicy.refundable ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-mint" aria-hidden="true" />
                          <span className="text-navy">
                            Free cancellation
                            {room.cancellationPolicy.freeCancellationUntil
                              ? ` until ${new Date(room.cancellationPolicy.freeCancellationUntil).toLocaleDateString("en-GB")}`
                              : ""}
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5 text-orange" aria-hidden="true" />
                          <span className="text-muted-foreground">Non-refundable</span>
                        </>
                      )}
                    </p>
                  </div>
                  <p className="text-base font-extrabold">
                    {formatPrice(room.price, room.currency)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        {full?.policies ? (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy">Hotel policies</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {full.policies.slice(0, 800)}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total stay from</p>
            <p className="text-2xl font-extrabold">{formatPrice(hotel.price, hotel.currency)}</p>
            {hotel.nights ? (
              <p className="text-xs text-muted-foreground">
                {hotel.nights} night{hotel.nights > 1 ? "s" : ""} · {hotel.currency}
              </p>
            ) : null}
          </div>
          <Button className="btn-gradient border-0 text-white" onClick={() => onSelect(hotel)}>
            <BedDouble className="mr-2 h-4 w-4" aria-hidden="true" />
            Select Hotel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
