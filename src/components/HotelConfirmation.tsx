import type { ReactNode } from "react";
import { BedDouble, CalendarCheck, CalendarX, Check, Moon, Users, X } from "lucide-react";
import type { HotelResult, RoomResult } from "@/lib/travel-api/hotel.types";
import type { StayInputShape } from "@/lib/travel-api/hotel-stay";
import {
  describeCancellation,
  formatHotelPrice,
  formatStayDate,
  nightsBetween,
  perNightPrice,
} from "@/lib/travel-api/hotel-format";

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-navy">{value}</p>
    </div>
  );
}

/**
 * Confirmation step shown after a hotel or room is selected.
 * Summarises the stay before the request/payment flow continues.
 */
export function HotelConfirmation({
  hotel,
  room,
  stay,
  children,
}: {
  hotel: HotelResult;
  room: RoomResult | null;
  stay: StayInputShape | null;
  children?: ReactNode;
}) {
  const checkIn = hotel.checkInDate ?? stay?.checkInDate ?? null;
  const checkOut = hotel.checkOutDate ?? stay?.checkOutDate ?? null;
  const nights = hotel.nights ?? nightsBetween(checkIn, checkOut);
  const guests = (stay?.guests.adults ?? 1) + (stay?.guests.children ?? 0);
  const price = room?.price ?? hotel.price;
  const currency = room?.currency ?? hotel.currency;
  const refundable = room
    ? room.cancellationPolicy.refundable
    : hotel.rooms.some((r) => r.cancellationPolicy.refundable);
  const policy = room
    ? describeCancellation(
        room.cancellationPolicy.refundable,
        room.cancellationPolicy.freeCancellationUntil,
      )
    : refundable
      ? "Free cancellation available on selected rooms"
      : "Non-refundable rates";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-orange/30 bg-white/85 shadow-card backdrop-blur-md">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {hotel.hotelImage ? (
              <img
                src={hotel.hotelImage}
                alt={hotel.hotelName}
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-2xl object-cover sm:h-16 sm:w-16"
              />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-tint to-peach-tint sm:h-16 sm:w-16">
                <BedDouble className="h-5 w-5 text-orange" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange">
                Confirm your stay
              </p>
              <h3 className="truncate text-base font-extrabold text-navy sm:text-lg">
                {hotel.hotelName}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {hotel.location || hotel.address}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-extrabold text-navy sm:text-2xl">
              {formatHotelPrice(price, currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {nights > 0
                ? `${formatHotelPrice(perNightPrice(price, nights), currency)} / night`
                : "Total stay"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryItem
            icon={<BedDouble className="h-3.5 w-3.5 text-orange" aria-hidden="true" />}
            label="Room type"
            value={room?.roomName ?? "To be confirmed"}
          />
          <SummaryItem
            icon={<CalendarCheck className="h-3.5 w-3.5 text-orange" aria-hidden="true" />}
            label="Check-in"
            value={formatStayDate(checkIn)}
          />
          <SummaryItem
            icon={<CalendarX className="h-3.5 w-3.5 text-orange" aria-hidden="true" />}
            label="Check-out"
            value={formatStayDate(checkOut)}
          />
          <SummaryItem
            icon={<Moon className="h-3.5 w-3.5 text-orange" aria-hidden="true" />}
            label="Nights"
            value={nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : "—"}
          />
          <SummaryItem
            icon={<Users className="h-3.5 w-3.5 text-orange" aria-hidden="true" />}
            label="Guests & rooms"
            value={`${guests} guest${guests > 1 ? "s" : ""} · ${stay?.rooms ?? 1} room${(stay?.rooms ?? 1) > 1 ? "s" : ""}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm">
          {refundable ? (
            <Check className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
          ) : (
            <X className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
          )}
          <span className="min-w-0 text-navy">{policy}</span>
          {room?.boardType ? (
            <span className="rounded-full bg-mint-tint px-2.5 py-1 text-[11px] font-semibold text-navy">
              {room.boardType}
            </span>
          ) : null}
        </div>

        {children}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Rates come from our accommodation partners and are re-confirmed by Amazingfly Travels
          before any payment is taken.
        </p>
      </div>
    </section>
  );
}
