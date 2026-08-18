import type { HotelSearchRequest } from "./hotel.types";

export type StayInputShape = {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests: { adults: number; children: number; childAges?: number[] | undefined };
  rooms: number;
  nationality?: string | undefined;
  currency?: string | undefined;
};

/** Normalises optional stay fields into a provider request object. */
export function toHotelRequest(data: StayInputShape): HotelSearchRequest {
  return {
    destination: data.destination,
    checkInDate: data.checkInDate,
    checkOutDate: data.checkOutDate,
    guests: {
      adults: data.guests.adults,
      children: data.guests.children,
      ...(data.guests.childAges ? { childAges: data.guests.childAges } : {}),
    },
    rooms: data.rooms,
    ...(data.nationality ? { nationality: data.nationality } : {}),
    ...(data.currency ? { currency: data.currency } : {}),
  };
}
