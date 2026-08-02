import type { HotelSearchRequest } from "./hotel.types";

export type StayInputShape = {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests: { adults: number; children: number };
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
    guests: data.guests,
    rooms: data.rooms,
    ...(data.nationality ? { nationality: data.nationality } : {}),
    ...(data.currency ? { currency: data.currency } : {}),
  };
}
