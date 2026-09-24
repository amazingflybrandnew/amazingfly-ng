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

/**
 * One cancellation-penalty period. ETG returns all times in UTC+0; a null
 * `startAt` means "from booking", a null `endAt` means "until check-in".
 */
export type CancellationPenalty = {
  startAt: string | null;
  endAt: string | null;
  amount: number; // 0 = free cancellation in this period
  currency: string;
};

export type CancellationPolicy = {
  refundable: boolean;
  freeCancellationUntil?: string | null; // ISO 8601 datetime, UTC
  description?: string;
  penalties?: CancellationPenalty[];
};

/** A tax the guest pays at the property; never added to the booking price. */
export type HotelPayableTax = {
  name: string;
  amount: number;
  currency: string; // original currency_code from ETG
};

export type HotelPaymentType = "deposit" | "hotel" | "now";

/**
 * One payment method RateHawk exposes for a specific live rate.
 * `amount/currency` are provider settlement values; `showAmount/showCurrency`
 * are the traveller-facing values returned by RateHawk for this search.
 */
export type HotelPaymentOption = {
  type: HotelPaymentType;
  amount: number;
  currency: string;
  showAmount: number;
  showCurrency: string;
  requiresCard: boolean;
  requiresCvc: boolean;
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
  price: number; // traveller-facing total for the stay
  currency: string;
  /** Original supplier amount/currency retained for RateHawk prebook and settlement. */
  providerPrice?: number;
  providerCurrency?: string;
  /** Payment methods are rate-specific and may change again at prebook. */
  paymentOptions: HotelPaymentOption[];
  /** tax_data.taxes with included_by_supplier: false, shown separately. */
  taxesPayableAtHotel?: HotelPayableTax[];
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
  price: number; // traveller-facing lowest total price for the stay
  currency: string;
  /** Original supplier amount/currency retained for provider reconciliation. */
  providerPrice?: number;
  providerCurrency?: string;
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
