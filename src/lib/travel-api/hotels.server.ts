/**
 * Server-only RateHawk (Emerging Travel Group / WorldOTA B2B v3) hotel client.
 *
 * Kept out of the client bundle by the `.server.ts` naming convention.
 * All HTTP goes through the shared sandbox client in `@/lib/ratehawk.server`,
 * which reads RATEHAWK_KEY_ID / RATEHAWK_API_TOKEN from project secrets.
 */

import {
  RateHawkApiError,
  RateHawkAuthError,
  ratehawkFetch,
} from "@/lib/ratehawk.server";
import type {
  CancellationPolicy,
  HotelResult,
  HotelSearchRequest,
  RoomResult,
} from "./hotel.types";

export class HotelApiNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Hotel search is not configured yet. Missing ${missing.join(", ")}.`);
    this.name = "HotelApiNotConfiguredError";
  }
}

export class HotelApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HotelApiError";
  }
}

/** Currencies the RateHawk sandbox prices in. Anything else falls back to USD. */
const SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP", "AED", "PLN", "RUB"]);

/** Max rates shown per hotel at this stage. */
const MAX_RATES_PER_HOTEL = 2;

/** How many hotels we enrich with static content (hotel/info is 30 req/min). */
const MAX_HOTELS = 12;

function providerCurrency(requested: string | undefined): string {
  const code = (requested ?? "USD").toUpperCase();
  return SUPPORTED_CURRENCIES.has(code) ? code : "USD";
}

/** POST helper delegating to the shared sandbox client, with friendly errors. */
async function rateHawkFetch<T>(path: string, body: unknown): Promise<T | null> {
  try {
    return await ratehawkFetch<T>(`/api/b2b/v3${path}`, body);
  } catch (error) {
    if (error instanceof RateHawkAuthError) {
      throw new HotelApiNotConfiguredError(["RATEHAWK_KEY_ID", "RATEHAWK_API_TOKEN"]);
    }
    if (error instanceof RateHawkApiError) {
      if (error.status === 401 || error.status === 403) {
        throw new HotelApiError(
          "Hotel provider rejected our credentials. Please contact support.",
        );
      }
      if (error.status === 429) {
        throw new HotelApiError(
          "Too many hotel searches right now. Please retry shortly.",
        );
      }
      throw new HotelApiError(friendlyProviderError(error.message, error.status));
    }
    throw new HotelApiError("Could not reach the hotel provider. Please try again.");
  }
}

/** Translates RateHawk error codes into copy we can show a traveller. */
function friendlyProviderError(code: string | null | undefined, status: number): string {
  switch (code) {
    case "invalid_params":
    case "invalid_checkin":
    case "invalid_checkout":
      return "Please check your travel dates and guest details and try again.";
    case "unsupported_currency":
      return "That currency isn't supported for hotel pricing.";
    case "decode_error":
    case "invalid_auth":
      return "Hotel provider rejected our credentials. Please contact support.";
    case "hotels_not_found":
    case "no_results":
      return "No hotels are available for those dates.";
    default:
      return `Hotel search failed (${code ?? status}). Please try again.`;
  }
}


/** Number of nights between two ISO dates; 0 when invalid. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(checkIn);
  const end = Date.parse(checkOut);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

function assertValidStay(request: HotelSearchRequest): number {
  const nights = nightsBetween(request.checkInDate, request.checkOutDate);
  if (!nights) {
    throw new HotelApiError(
      "Please choose a check-out date that is after the check-in date.",
    );
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (Date.parse(request.checkInDate) < today.getTime()) {
    throw new HotelApiError("Check-in date cannot be in the past.");
  }
  return nights;
}

/** RateHawk expects guests grouped per room. */
function buildGuests(request: HotelSearchRequest) {
  const rooms = Math.max(1, request.rooms || 1);
  const adults = Math.max(1, request.guests.adults || 1);
  const childAges =
    request.guests.childAges ??
    Array.from({ length: request.guests.children ?? 0 }, () => 8);

  const perRoomAdults = Math.max(1, Math.ceil(adults / rooms));
  return Array.from({ length: rooms }, (_, index) => ({
    adults: index === rooms - 1 ? Math.max(1, adults - perRoomAdults * (rooms - 1)) : perRoomAdults,
    children: index === 0 ? childAges : [],
  }));
}

/* -------------------------------------------------------------------------- */
/* Provider response shapes (internal only)                                    */
/* -------------------------------------------------------------------------- */

type RhDailyPrice = { amount?: string; currency_code?: string };

type RhRate = {
  match_hash?: string;
  book_hash?: string;
  room_name?: string;
  meal?: string;
  room_data_info?: { types?: { bedding_type?: string } };
  rg_ext?: { capacity?: number; bedding?: number; class?: number };
  payment_options?: {
    payment_types?: {
      amount?: string;
      currency_code?: string;
      show_amount?: string;
      show_currency_code?: string;
      cancellation_penalties?: {
        free_cancellation_before?: string | null;
        policies?: { start_at?: string | null; end_at?: string | null; amount_show?: string }[];
      };
    }[];
  };
  daily_prices?: RhDailyPrice[] | string[];
};

type RhSerpHotel = { id?: string; hid?: number; rates?: RhRate[] };

type RhHotelInfo = {
  id?: string;
  hid?: number;
  name?: string;
  star_rating?: number;
  address?: string;
  region?: { name?: string; country_code?: string };
  latitude?: number;
  longitude?: number;
  images?: string[];
  amenity_groups?: { group_name?: string; amenities?: string[] }[];
  description_struct?: { title?: string; paragraphs?: string[] }[];
  policy_struct?: { title?: string; paragraphs?: string[] }[];
};

/* -------------------------------------------------------------------------- */
/* Mapping helpers                                                             */
/* -------------------------------------------------------------------------- */

function imageUrl(template: string | undefined, size = "640x400"): string | null {
  if (!template) return null;
  return template.replace("{size}", size);
}

function ratePrice(rate: RhRate, fallbackCurrency: string): { price: number; currency: string } {
  const option = rate.payment_options?.payment_types?.[0];
  const amount = Number(option?.show_amount ?? option?.amount ?? 0);
  const currency = option?.show_currency_code ?? option?.currency_code ?? fallbackCurrency;
  return { price: Number.isFinite(amount) ? amount : 0, currency };
}

function mapCancellation(rate: RhRate): CancellationPolicy {
  const penalties = rate.payment_options?.payment_types?.[0]?.cancellation_penalties;
  const freeUntil = penalties?.free_cancellation_before ?? null;
  return {
    refundable: Boolean(freeUntil),
    freeCancellationUntil: freeUntil,
    description: freeUntil
      ? `Free cancellation until ${freeUntil}`
      : "Non-refundable rate",
  };
}

function mapRate(rate: RhRate, fallbackCurrency: string): RoomResult {
  const { price, currency } = ratePrice(rate, fallbackCurrency);
  const name = rate.room_name ?? "Standard room";
  return {
    roomId: rate.book_hash ?? rate.match_hash ?? name,
    roomName: name,
    roomType: name,
    bedType: rate.room_data_info?.types?.bedding_type ?? "Not specified",
    capacity: rate.rg_ext?.capacity ?? 2,
    cancellationPolicy: mapCancellation(rate),
    ...(rate.meal ? { boardType: humanise(rate.meal) } : {}),
    price,
    currency,
  };
}

function humanise(value: string): string {
  const text = value.replace(/[-_]/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function mapHotel(
  serp: RhSerpHotel,
  info: RhHotelInfo | undefined,
  request: HotelSearchRequest,
  nights: number,
): HotelResult {
  const currency = providerCurrency(request.currency);
  const rooms = (serp.rates ?? [])
    .map((rate) => mapRate(rate, currency))
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_RATES_PER_HOTEL);
  const cheapest = rooms[0] ?? null;

  const images = (info?.images ?? []).map((i) => imageUrl(i)).filter(Boolean) as string[];
  const amenities = (info?.amenity_groups ?? []).flatMap((g) => g.amenities ?? []);
  const hotelId = serp.id ?? info?.id ?? String(serp.hid ?? info?.hid ?? "");

  return {
    hotelId,
    hotelName: info?.name ?? hotelId,
    hotelImage: images[0] ?? null,
    images,
    rating: info?.star_rating ?? 0,
    reviewScore: null,
    reviewCount: null,
    location: info?.region?.name ?? request.destination,
    address: info?.address ?? "",
    latitude: info?.latitude ?? null,
    longitude: info?.longitude ?? null,
    rooms,
    amenities: Array.from(new Set(amenities)).slice(0, 30),
    price: cheapest?.price ?? 0,
    currency: cheapest?.currency ?? currency,
    availability: rooms.length > 0,
    checkInDate: request.checkInDate,
    checkOutDate: request.checkOutDate,
    nights,
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/** Resolve a free-text destination into a RateHawk region id. */
async function resolveRegionId(destination: string): Promise<number> {
  const data = await rateHawkFetch<{ regions?: { id?: number; name?: string }[] }>(
    "/search/multicomplete/",
    { query: destination, language: "en" },
  );
  const region = data?.regions?.[0];
  if (!region?.id) {
    throw new HotelApiError(`We couldn't find "${destination}". Try a different city.`);
  }
  return region.id;
}

/** Load static content for a set of hotel ids. */
async function fetchHotelInfo(hotelIds: string[]): Promise<Map<string, RhHotelInfo>> {
  const entries = await Promise.all(
    hotelIds.map(async (id) => {
      try {
        const data = await rateHawkFetch<RhHotelInfo>("/hotel/info/", {
          id,
          language: "en",
        });
        return data ? ([id, data] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return new Map(entries.filter(Boolean) as (readonly [string, RhHotelInfo])[]);
}

/** Search RateHawk for hotels matching the request criteria. */
export async function searchHotels(
  request: HotelSearchRequest,
): Promise<HotelResult[]> {
  const nights = assertValidStay(request);
  const regionId = await resolveRegionId(request.destination);

  const data = await rateHawkFetch<{ hotels?: RhSerpHotel[] }>(
    "/search/serp/region/",
    {
      region_id: regionId,
      checkin: request.checkInDate,
      checkout: request.checkOutDate,
      guests: buildGuests(request),
      residency: (request.nationality ?? "gb").toLowerCase(),
      currency: providerCurrency(request.currency),
      language: "en",
      hotels_limit: MAX_HOTELS,
    },
  );

  const hotels = (data?.hotels ?? [])
    .filter((h) => (h.rates ?? []).length > 0)
    .slice(0, MAX_HOTELS);
  if (!hotels.length) return [];

  const ids = hotels.map((h) => h.id ?? String(h.hid ?? "")).filter(Boolean);
  const info = await fetchHotelInfo(ids);

  return hotels
    .map((hotel) =>
      mapHotel(hotel, info.get(hotel.id ?? String(hotel.hid ?? "")), request, nights),
    )
    .sort((a, b) => a.price - b.price);

}

export type HotelStaticDetails = {
  description: string;
  policies: string;
};

/** Fetch the full static record for a single hotel id. */
export async function getHotelDetails(
  hotelId: string,
): Promise<(HotelResult & HotelStaticDetails) | null> {
  const info = await rateHawkFetch<RhHotelInfo>("/hotel/info/", {
    id: hotelId,
    language: "en",
  });
  if (!info) return null;

  const images = (info.images ?? []).map((i) => imageUrl(i)).filter(Boolean) as string[];
  const amenities = (info.amenity_groups ?? []).flatMap((g) => g.amenities ?? []);
  const flatten = (blocks: { title?: string; paragraphs?: string[] }[] | undefined) =>
    (blocks ?? [])
      .map((b) => [b.title, ...(b.paragraphs ?? [])].filter(Boolean).join("\n"))
      .join("\n\n");

  return {
    hotelId: info.id ?? hotelId,
    hotelName: info.name ?? hotelId,
    hotelImage: images[0] ?? null,
    images,
    rating: info.star_rating ?? 0,
    reviewScore: null,
    reviewCount: null,
    location: info.region?.name ?? "",
    address: info.address ?? "",
    latitude: info.latitude ?? null,
    longitude: info.longitude ?? null,
    rooms: [],
    amenities: Array.from(new Set(amenities)),
    price: 0,
    currency: "USD",
    availability: false,
    description: flatten(info.description_struct),
    policies: flatten(info.policy_struct),
  };
}

/**
 * Retrieve hotelpage (RateHawk `/api/b2b/v3/search/hp/`).
 *
 * Returns every available rate for the hotel and stay, de-duplicated by
 * booking hash and sorted cheapest first.
 */
export async function getHotelRooms(
  hotelId: string,
  request: HotelSearchRequest,
): Promise<RoomResult[]> {
  assertValidStay(request);

  const currency = providerCurrency(request.currency);
  const data = await rateHawkFetch<{ hotels?: RhSerpHotel[] }>("/search/hp/", {
    id: hotelId,
    checkin: request.checkInDate,
    checkout: request.checkOutDate,
    guests: buildGuests(request),
    residency: (request.nationality ?? "gb").toLowerCase(),
    currency,
    language: "en",
  });

  const rates = data?.hotels?.[0]?.rates ?? [];
  const seen = new Set<string>();
  const rooms: RoomResult[] = [];
  for (const rate of rates) {
    const room = mapRate(rate, currency);
    const key = `${room.roomId}|${room.price}|${room.boardType ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rooms.push(room);
  }
  return rooms.sort((a, b) => a.price - b.price);
}

/* -------------------------------------------------------------------------- */
/* Prebook                                                                     */
/* -------------------------------------------------------------------------- */

export type PrebookOutcome =
  | { status: "available"; room: RoomResult }
  | { status: "price_changed"; room: RoomResult; previousPrice: number }
  | { status: "unavailable"; message: string };

/**
 * Prebook a rate selected from the hotelpage (`/api/b2b/v3/hotel/prebook/`).
 *
 * Confirms the rate is still bookable and returns the live price so the caller
 * can ask the traveller to confirm when it has moved.
 */
export async function prebookHotelRate(
  bookHash: string,
  expectedPrice: number,
  expectedCurrency: string,
): Promise<PrebookOutcome> {
  const currency = providerCurrency(expectedCurrency);

  let data: { hotels?: RhSerpHotel[] } | null = null;
  try {
    data = await rateHawkFetch<{ hotels?: RhSerpHotel[] }>("/hotel/prebook/", {
      hash: bookHash,
      price_increase_percent: 100,
    });
  } catch (error) {
    const message =
      error instanceof HotelApiError
        ? error.message
        : "This rate could not be confirmed. Please pick another room.";
    return { status: "unavailable", message };
  }

  const rate = data?.hotels?.[0]?.rates?.[0];
  if (!rate) {
    return {
      status: "unavailable",
      message: "This rate has just sold out. Please choose another room.",
    };
  }

  const room = mapRate(rate, currency);
  if (!room.price) {
    return {
      status: "unavailable",
      message: "This rate is no longer priced by the hotel. Please choose another room.",
    };
  }

  const moved =
    Math.abs(room.price - expectedPrice) > 0.01 || room.currency !== expectedCurrency;

  return moved
    ? { status: "price_changed", room, previousPrice: expectedPrice }
    : { status: "available", room };
}
