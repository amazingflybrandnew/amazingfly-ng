/**
 * Server-only hotel API client (foundation stage).
 *
 * This module is kept out of the client bundle by the `.server.ts` naming
 * convention. Credentials are read inside function bodies from `process.env`
 * and are never exposed to the frontend.
 *
 * No live provider is wired up yet — the request/response plumbing, error
 * handling and typing mirror `flights.server.ts` so a provider can be dropped
 * in later without touching call sites.
 */

import type {
  HotelResult,
  HotelSearchRequest,
  RoomResult,
} from "./hotel.types";

type HotelCredentials = { baseUrl: string; apiKey: string; apiSecret?: string };

export class HotelApiNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(
      `Hotel search is not configured yet. Missing ${missing.join(", ")}.`,
    );
    this.name = "HotelApiNotConfiguredError";
  }
}

function readCredentials(): HotelCredentials {
  const baseUrl = process.env["HOTEL_API_BASE_URL"];
  const apiKey = process.env["HOTEL_API_KEY"];
  const apiSecret = process.env["HOTEL_API_SECRET"];

  const missing = [
    ...(baseUrl ? [] : ["HOTEL_API_BASE_URL"]),
    ...(apiKey ? [] : ["HOTEL_API_KEY"]),
  ];
  if (missing.length) throw new HotelApiNotConfiguredError(missing);

  return {
    baseUrl: baseUrl!.replace(/\/$/, ""),
    apiKey: apiKey!,
    ...(apiSecret ? { apiSecret } : {}),
  };
}

/** Generic provider fetch helper with consistent error surfacing. */
async function hotelFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const { baseUrl, apiKey, apiSecret } = readCredentials();

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(apiSecret ? { "X-Api-Secret": apiSecret } : {}),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; errors?: { title?: string; message?: string }[] }
    | null;

  if (!response.ok) {
    const first = payload?.errors?.[0];
    throw new Error(
      first?.message || first?.title || `Hotel request failed (${response.status}).`,
    );
  }
  return (payload?.data ?? null) as T;
}

/** Number of nights between two ISO dates; 0 when invalid. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(checkIn);
  const end = Date.parse(checkOut);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

/**
 * Search hotels matching the request criteria.
 * Provider not connected yet — returns an empty result set once configured.
 */
export async function searchHotels(
  request: HotelSearchRequest,
): Promise<HotelResult[]> {
  readCredentials(); // fails fast with a clear message until configured

  const nights = nightsBetween(request.checkInDate, request.checkOutDate);
  void nights;
  void hotelFetch;
  return [];
}

/** Fetch the full record for a single hotel id. Provider not connected yet. */
export async function getHotelDetails(
  hotelId: string,
): Promise<HotelResult | null> {
  readCredentials();
  void hotelId;
  return null;
}

/** Fetch bookable rooms for a hotel and stay. Provider not connected yet. */
export async function getHotelRooms(
  hotelId: string,
  request: HotelSearchRequest,
): Promise<RoomResult[]> {
  readCredentials();
  void hotelId;
  void request;
  return [];
}
