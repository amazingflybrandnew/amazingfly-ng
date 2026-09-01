/**
 * Server-only RateHawk / ETG B2B v3 hotel client.
 * Supports regular region search plus direct HID search used during certification.
 */

import { RateHawkApiError, RateHawkAuthError, ratehawkFetch } from "@/lib/ratehawk.server";
import type {
  CancellationPolicy,
  HotelPaymentOption,
  HotelPaymentType,
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

const SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "GBP", "AED", "PLN", "RUB"]);
const MAX_RATES_PER_HOTEL = 2;
const MAX_HOTELS = 12;
const PREBOOK_PRICE_INCREASE_PERCENT = 10;

function providerCurrency(requested: string | undefined): string {
  const code = (requested ?? "USD").toUpperCase();
  return SUPPORTED_CURRENCIES.has(code) ? code : "USD";
}

async function rateHawkFetch<T>(path: string, body: unknown): Promise<T | null> {
  try {
    return await ratehawkFetch<T>(`/api/b2b/v3${path}`, body);
  } catch (error) {
    if (error instanceof RateHawkAuthError) {
      throw new HotelApiNotConfiguredError(["RATEHAWK_KEY_ID", "RATEHAWK_API_TOKEN"]);
    }
    if (error instanceof RateHawkApiError) {
      if (error.status === 401 || error.status === 403) {
        throw new HotelApiError("Hotel provider rejected our credentials. Please contact support.");
      }
      if (error.status === 429) {
        throw new HotelApiError("Too many hotel searches right now. Please retry shortly.");
      }
      throw new HotelApiError(friendlyProviderError(error.code, error.status));
    }
    throw new HotelApiError("Could not reach the hotel provider. Please try again.");
  }
}

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

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(checkIn);
  const end = Date.parse(checkOut);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

function assertValidStay(request: HotelSearchRequest): number {
  const nights = nightsBetween(request.checkInDate, request.checkOutDate);
  if (!nights) {
    throw new HotelApiError("Please choose a check-out date that is after the check-in date.");
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (Date.parse(request.checkInDate) < today.getTime()) {
    throw new HotelApiError("Check-in date cannot be in the past.");
  }
  const expectedChildren = request.guests.children ?? 0;
  const childAges = request.guests.childAges ?? [];
  if (childAges.length !== expectedChildren) {
    throw new HotelApiError("Please provide the exact age of every child.");
  }
  return nights;
}

/** RateHawk expects guests grouped per room. */
function buildGuests(request: HotelSearchRequest) {
  const rooms = Math.max(1, request.rooms || 1);
  const adults = Math.max(1, request.guests.adults || 1);
  const childAges = request.guests.childAges ?? [];
  const perRoomAdults = Math.max(1, Math.ceil(adults / rooms));

  return Array.from({ length: rooms }, (_, index) => ({
    adults: index === rooms - 1 ? Math.max(1, adults - perRoomAdults * (rooms - 1)) : perRoomAdults,
    children: index === 0 ? childAges : [],
  }));
}

type RhDailyPrice = { amount?: string; currency_code?: string };

type RhPaymentType = {
  type?: string;
  amount?: string;
  currency_code?: string;
  show_amount?: string;
  show_currency_code?: string;
  is_need_credit_card_data?: boolean;
  is_need_cvc?: boolean;
  cancellation_penalties?: {
    free_cancellation_before?: string | null;
    policies?: { start_at?: string | null; end_at?: string | null; amount_show?: string }[];
  };
};

type RhRate = {
  match_hash?: string;
  book_hash?: string;
  room_name?: string;
  meal?: string;
  room_data_info?: { types?: { bedding_type?: string } };
  rg_ext?: { capacity?: number; bedding?: number; class?: number };
  payment_options?: { payment_types?: RhPaymentType[] };
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
  images_ext?: { url?: string }[];
  amenity_groups?: { group_name?: string; amenities?: string[] }[];
  description_struct?: { title?: string; paragraphs?: string[] }[];
  policy_struct?: { title?: string; paragraphs?: string[] }[];
};

type HotelRef = { id?: string; hid?: number };

function parseHotelRef(value: string): HotelRef {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:hid:)?(\d{6,10})$/i);
  if (match?.[1]) return { hid: Number(match[1]) };
  return { id: trimmed };
}

function refKey(ref: HotelRef): string {
  return ref.hid ? `hid:${ref.hid}` : (ref.id ?? "");
}

function serpRef(hotel: RhSerpHotel): string {
  return hotel.hid ? `hid:${hotel.hid}` : (hotel.id ?? "");
}

function imageUrl(template: string | undefined, size = "640x400"): string | null {
  if (!template) return null;
  return template.replace("{size}", size);
}

function hotelImages(info: RhHotelInfo | undefined): string[] {
  const templates = [
    ...(info?.images ?? []),
    ...((info?.images_ext ?? []).map((image) => image.url).filter(Boolean) as string[]),
  ];
  return Array.from(
    new Set(templates.map((template) => imageUrl(template)).filter(Boolean)),
  ) as string[];
}

function isPaymentType(value: string | undefined): value is HotelPaymentType {
  return value === "deposit" || value === "hotel" || value === "now";
}

function numberOrZero(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPaymentOptions(rate: RhRate, fallbackCurrency: string): HotelPaymentOption[] {
  const mapped: HotelPaymentOption[] = [];
  for (const option of rate.payment_options?.payment_types ?? []) {
    if (!isPaymentType(option.type)) continue;
    const currency = option.currency_code ?? fallbackCurrency;
    const showCurrency = option.show_currency_code ?? currency;
    mapped.push({
      type: option.type,
      amount: numberOrZero(option.amount),
      currency,
      showAmount: numberOrZero(option.show_amount ?? option.amount),
      showCurrency,
      requiresCard: Boolean(option.is_need_credit_card_data),
      requiresCvc: Boolean(option.is_need_cvc),
    });
  }
  return mapped;
}

function ratePrice(rate: RhRate, fallbackCurrency: string): { price: number; currency: string } {
  const option = rate.payment_options?.payment_types?.[0];
  const amount = numberOrZero(option?.show_amount ?? option?.amount);
  const currency = option?.show_currency_code ?? option?.currency_code ?? fallbackCurrency;
  return { price: amount, currency };
}

function mapCancellation(rate: RhRate): CancellationPolicy {
  const penalties = rate.payment_options?.payment_types?.[0]?.cancellation_penalties;
  const freeUntil = penalties?.free_cancellation_before ?? null;
  return {
    refundable: Boolean(freeUntil),
    freeCancellationUntil: freeUntil,
    description: freeUntil ? `Free cancellation until ${freeUntil}` : "Non-refundable rate",
  };
}

function mapRate(rate: RhRate, fallbackCurrency: string): RoomResult {
  const { price, currency } = ratePrice(rate, fallbackCurrency);
  const name = rate.room_name ?? "Standard room";
  return {
    roomId: rate.book_hash ?? rate.match_hash ?? name,
    bookHash: rate.book_hash ?? null,
    roomName: name,
    roomType: name,
    bedType: rate.room_data_info?.types?.bedding_type ?? "Not specified",
    capacity: rate.rg_ext?.capacity ?? 2,
    cancellationPolicy: mapCancellation(rate),
    ...(rate.meal ? { boardType: humanise(rate.meal) } : {}),
    price,
    currency,
    paymentOptions: mapPaymentOptions(rate, fallbackCurrency),
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
  const images = hotelImages(info);
  const amenities = (info?.amenity_groups ?? []).flatMap((g) => g.amenities ?? []);
  const hotelId = serpRef(serp) || (info?.hid ? `hid:${info.hid}` : (info?.id ?? ""));

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

async function resolveRegionId(destination: string): Promise<number> {
  const data = await rateHawkFetch<{ regions?: { id?: number; name?: string }[] }>(
    "/search/multicomplete/",
    { query: destination, language: "en" },
  );
  const region = data?.regions?.[0];
  if (!region?.id)
    throw new HotelApiError(`We couldn't find "${destination}". Try a different city.`);
  return region.id;
}

async function fetchHotelInfo(refs: string[]): Promise<Map<string, RhHotelInfo>> {
  const parsed = refs.map(parseHotelRef);
  const hids = parsed.flatMap((ref) => (ref.hid ? [ref.hid] : []));
  const ids = parsed.flatMap((ref) => (ref.id ? [ref.id] : []));

  // Numeric HIDs returned by SERP need to be mapped to static hotel content.
  // Fetch the requested properties in one Content API call instead of making
  // one request per result. This also covers every sandbox property returned
  // by search, not only the certification hotel.
  try {
    const content = await ratehawkFetch<RhHotelInfo[]>("/api/content/v1/hotel_content_by_ids/", {
      ...(hids.length ? { hids } : {}),
      ...(ids.length ? { ids } : {}),
      language: "en",
    });
    if (content?.length) {
      const mapped = new Map<string, RhHotelInfo>();
      for (const hotel of content) {
        if (hotel.hid) mapped.set(`hid:${hotel.hid}`, hotel);
        if (hotel.id) mapped.set(hotel.id, hotel);
      }
      return mapped;
    }
  } catch {
    // Keep the legacy hotel-info fallback for accounts where Content API is
    // unavailable, while allowing search rates to remain usable.
  }

  const entries = await Promise.all(
    refs.map(async (key) => {
      const ref = parseHotelRef(key);
      try {
        const data = await rateHawkFetch<RhHotelInfo>("/hotel/info/", {
          ...ref,
          language: "en",
        });
        return data ? ([key, data] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return new Map(entries.filter(Boolean) as (readonly [string, RhHotelInfo])[]);
}

function directHid(destination: string): number | null {
  const match = destination.trim().match(/^(?:hid\s*:?[ ]*)?(\d{6,10})$/i);
  return match?.[1] ? Number(match[1]) : null;
}

export async function searchHotels(request: HotelSearchRequest): Promise<HotelResult[]> {
  const nights = assertValidStay(request);
  const common = {
    checkin: request.checkInDate,
    checkout: request.checkOutDate,
    guests: buildGuests(request),
    residency: (request.nationality ?? "gb").toLowerCase(),
    currency: providerCurrency(request.currency),
    language: "en",
  };

  const hid = directHid(request.destination);
  const data = hid
    ? await rateHawkFetch<{ hotels?: RhSerpHotel[] }>("/search/serp/hotels/", {
        ...common,
        hids: [hid],
      })
    : await rateHawkFetch<{ hotels?: RhSerpHotel[] }>("/search/serp/region/", {
        ...common,
        region_id: await resolveRegionId(request.destination),
        hotels_limit: MAX_HOTELS,
      });

  const hotels = (data?.hotels ?? [])
    .filter((hotel) => (hotel.rates ?? []).length > 0)
    .slice(0, MAX_HOTELS);
  if (!hotels.length) return [];

  const refs = hotels.map(serpRef).filter(Boolean);
  const info = await fetchHotelInfo(refs);
  return hotels
    .map((hotel) => mapHotel(hotel, info.get(serpRef(hotel)), request, nights))
    .sort((a, b) => a.price - b.price);
}

export type HotelStaticDetails = { description: string; policies: string };

export async function getHotelDetails(
  hotelId: string,
): Promise<(HotelResult & HotelStaticDetails) | null> {
  const ref = parseHotelRef(hotelId);
  const key = refKey(ref);
  const contentInfo = (await fetchHotelInfo([key])).get(key);
  const info =
    contentInfo ?? (await rateHawkFetch<RhHotelInfo>("/hotel/info/", { ...ref, language: "en" }));
  if (!info) return null;

  const images = hotelImages(info);
  const amenities = (info.amenity_groups ?? []).flatMap((g) => g.amenities ?? []);
  const flatten = (blocks: { title?: string; paragraphs?: string[] }[] | undefined) =>
    (blocks ?? [])
      .map((b) => [b.title, ...(b.paragraphs ?? [])].filter(Boolean).join("\n"))
      .join("\n\n");

  return {
    hotelId: info.hid ? `hid:${info.hid}` : (info.id ?? hotelId),
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

export async function getHotelRooms(
  hotelId: string,
  request: HotelSearchRequest,
): Promise<RoomResult[]> {
  assertValidStay(request);
  const currency = providerCurrency(request.currency);
  const ref = parseHotelRef(hotelId);
  const data = await rateHawkFetch<{ hotels?: RhSerpHotel[] }>("/search/hp/", {
    ...ref,
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

export type PrebookOutcome =
  | { status: "available"; room: RoomResult }
  | { status: "price_changed"; room: RoomResult; previousPrice: number }
  | { status: "unavailable"; message: string };

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
      price_increase_percent: PREBOOK_PRICE_INCREASE_PERCENT,
    });
  } catch (error) {
    return {
      status: "unavailable",
      message:
        error instanceof HotelApiError
          ? error.message
          : "This rate could not be confirmed. Please pick another room.",
    };
  }

  const rate = data?.hotels?.[0]?.rates?.[0];
  if (!rate) {
    return {
      status: "unavailable",
      message: "This rate has just sold out. Please choose another room.",
    };
  }
  if (!rate.book_hash) {
    return {
      status: "unavailable",
      message: "This rate could not be confirmed. Please choose another room.",
    };
  }

  const room: RoomResult = { ...mapRate(rate, currency), bookHash: rate.book_hash };
  if (!room.price) {
    return {
      status: "unavailable",
      message: "This rate is no longer priced by the hotel. Please choose another room.",
    };
  }
  if (!room.paymentOptions.length) {
    return {
      status: "unavailable",
      message: "This rate no longer has a supported payment method. Please choose another room.",
    };
  }

  const moved = Math.abs(room.price - expectedPrice) > 0.01 || room.currency !== expectedCurrency;
  return moved
    ? { status: "price_changed", room, previousPrice: expectedPrice }
    : { status: "available", room };
}
