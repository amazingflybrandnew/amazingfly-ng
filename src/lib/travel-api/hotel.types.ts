/** Hotel API data contracts. Types are erased at runtime and safe to import anywhere. */

export type HotelGuests = {
  adults: number;
  children?: number;
  childAges?: number[];
};

export type HotelSearchRequest = {
  destination: string; // city name, IATA/city code or provider location id
  checkInDate: string; // ISO 8601 date, e.g. 2026-09-12
  checkOutDate: string; // ISO 8601 date
  guests: HotelGuests;
  rooms: number;
  nationality?: string; // ISO 3166-1 alpha-2, e.g. "NG" (required by some providers)
  currency?: string; // preferred display currency, e.g. "NGN"
};

export type CancellationPolicy = {
  refundable: boolean;
  freeCancellationUntil?: string | null; // ISO 8601 datetime
  description?: string;
};

export type RoomResult = {
  roomId: string;
  /**
   * RateHawk `book_hash` for this rate. Only rates returned by the hotelpage
   * (`/search/hp/`) or `/hotel/prebook/` carry a bookable hash; SERP rates may
   * not. Never substitute `match_hash` or a room name here.
   */
  bookHash?: string | null;
  roomName: string;
  roomType: string;
  bedType: string;
  capacity: number; // max guests per room
  cancellationPolicy: CancellationPolicy;
  boardType?: string; // e.g. "Room only", "Breakfast included"
  price: number; // total for the stay
  currency: string;
};

export type HotelResult = {
  hotelId: string;
  hotelName: string;
  hotelImage?: string | null;
  images?: string[];
  rating: number; // star rating, 0-5
  reviewScore?: number | null; // guest review score, e.g. 8.6
  reviewCount?: number | null;
  location: string; // city / area label
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  rooms: RoomResult[];
  amenities: string[];
  price: number; // lowest total price for the stay
  currency: string;
  availability: boolean;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
};

export type HotelSearchResponse =
  | { ok: true; results: HotelResult[] }
  | { ok: false; error: string };

export type HotelDetailsResponse =
  | { ok: true; hotel: HotelResult | null }
  | { ok: false; error: string };

export type HotelRoomsResponse =
  | { ok: true; rooms: RoomResult[] }
  | { ok: false; error: string };
