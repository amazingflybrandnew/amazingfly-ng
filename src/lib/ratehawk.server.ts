/**
 * Server-only RateHawk / ETG API client.
 * Sandbox is the safe default; production uses the current RateHawk host.
 */

const SANDBOX_BASE_URL = "https://api-sandbox.ratehawk.com";
const DEFAULT_PRODUCTION_BASE_URL = "https://api.ratehawk.com";

export type RateHawkEnvironment = "sandbox" | "production";

export class RateHawkAuthError extends Error {
  constructor() {
    super("RateHawk credentials are missing from project secrets.");
    this.name = "RateHawkAuthError";
  }
}

export class RateHawkApiError extends Error {
  readonly code: string;

  constructor(public status: number, message: string) {
    super(message);
    this.name = "RateHawkApiError";
    this.code = message.trim().toLowerCase();
  }
}

export function ratehawkEnvironment(): RateHawkEnvironment {
  return process.env["RATEHAWK_ENVIRONMENT"]?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function isRateHawkSandbox(): boolean {
  return ratehawkEnvironment() === "sandbox";
}

function baseUrl(): string {
  const configured = process.env["RATEHAWK_BASE_URL"]?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return ratehawkEnvironment() === "production"
    ? DEFAULT_PRODUCTION_BASE_URL
    : SANDBOX_BASE_URL;
}

function basicAuthHeader(username: string, password: string): string {
  const raw = `${username}:${password}`;
  const encoded =
    typeof btoa === "function"
      ? btoa(raw)
      : Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

function readCredentials(): { username: string; password: string } {
  const username = process.env["RATEHAWK_KEY_ID"];
  const password = process.env["RATEHAWK_API_TOKEN"];
  if (!username || !password) throw new RateHawkAuthError();
  return { username, password };
}

export type RateHawkResponse<T> = {
  status?: string;
  data?: T | null;
  error?: string | null;
  debug?: unknown;
};

type UnknownRecord = Record<string, unknown>;

type StoredTraveller = {
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function normalizedName(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function ageOnDate(dateOfBirth: string, stayDate: string): number | null {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const stay = new Date(`${stayDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(stay.getTime())) return null;

  let age = stay.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    stay.getUTCMonth() < birth.getUTCMonth() ||
    (stay.getUTCMonth() === birth.getUTCMonth() && stay.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Booking Finish needs explicit child metadata. Search already contains child ages,
 * but the booking flow stores traveller DOBs. Rehydrate those DOBs here and add
 * is_child/age to child guests before the provider request leaves our server.
 */
async function enrichBookingFinishGuests(path: string, body: unknown): Promise<unknown> {
  if (!path.endsWith("/hotel/order/booking/finish/")) return body;

  const root = asRecord(body);
  const partner = asRecord(root?.["partner"]);
  const partnerOrderId = String(partner?.["partner_order_id"] ?? "").trim();
  const rooms = Array.isArray(root?.["rooms"]) ? (root?.["rooms"] as unknown[]) : [];
  if (!root || !partnerOrderId || rooms.length === 0) return body;

  const { createExternalSupabaseAdmin } = await import("@/lib/external-supabase.server");
  const db = createExternalSupabaseAdmin();
  const { data: booking, error: bookingError } = await db
    .from("hotel_bookings")
    .select("request_id")
    .eq("partner_order_id", partnerOrderId)
    .maybeSingle();
  if (bookingError) throw new Error(`Could not resolve stored hotel booking: ${bookingError.message}`);

  const requestId = (booking as { request_id?: string | null } | null)?.request_id;
  if (!requestId) return body;

  const [{ data: request, error: requestError }, { data: passengers, error: passengerError }] =
    await Promise.all([
      db.from("service_requests").select("hotel_check_in").eq("id", requestId).maybeSingle(),
      db
        .from("booking_passengers")
        .select("first_name, last_name, date_of_birth, created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true }),
    ]);

  if (requestError) throw new Error(`Could not load hotel check-in date: ${requestError.message}`);
  if (passengerError) throw new Error(`Could not load hotel travellers: ${passengerError.message}`);

  const checkIn = String((request as { hotel_check_in?: string | null } | null)?.hotel_check_in ?? "");
  const travellerRows = (passengers ?? []) as StoredTraveller[];
  const suppliedGuests = rooms.flatMap((roomValue) => {
    const room = asRecord(roomValue);
    return Array.isArray(room?.["guests"]) ? (room["guests"] as unknown[]) : [];
  });

  if (!checkIn || travellerRows.length !== suppliedGuests.length) {
    throw new Error(
      `Stored traveller count (${travellerRows.length}) does not match RateHawk booking guest count (${suppliedGuests.length}).`,
    );
  }

  const unused = new Set(travellerRows.map((_, index) => index));
  const takeTraveller = (guest: UnknownRecord): StoredTraveller | null => {
    const first = normalizedName(guest["first_name"]);
    const last = normalizedName(guest["last_name"]);
    let index = travellerRows.findIndex(
      (traveller, candidate) =>
        unused.has(candidate) &&
        normalizedName(traveller.first_name) === first &&
        normalizedName(traveller.last_name) === last,
    );
    if (index < 0) index = [...unused][0] ?? -1;
    if (index < 0) return null;
    unused.delete(index);
    return travellerRows[index] ?? null;
  };

  const enrichedRooms = rooms.map((roomValue) => {
    const room = asRecord(roomValue);
    if (!room) return roomValue;
    const guests = Array.isArray(room["guests"]) ? (room["guests"] as unknown[]) : [];
    return {
      ...room,
      guests: guests.map((guestValue) => {
        const guest = asRecord(guestValue);
        if (!guest) return guestValue;
        const traveller = takeTraveller(guest);
        const dob = traveller?.date_of_birth ?? "";
        const age = ageOnDate(dob, checkIn);
        if (age === null) {
          throw new Error("A valid date of birth is required for every hotel traveller.");
        }
        return age <= 17 ? { ...guest, is_child: true, age } : guest;
      }),
    };
  });

  return { ...root, rooms: enrichedRooms };
}

/** Return the full ETG response envelope so booking status is not discarded. */
export async function ratehawkRequest<T>(
  path: string,
  body: unknown,
): Promise<RateHawkResponse<T>> {
  const { username, password } = readCredentials();
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const requestBody = await enrichBookingFinishGuests(path, body);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(username, password),
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Amazingfly/1.0 (RateHawk B2B v3)",
    },
    body: JSON.stringify(requestBody ?? {}),
  });

  const payload = (await response.json().catch(() => null)) as RateHawkResponse<T> | null;
  if (!response.ok || payload?.status === "error") {
    throw new RateHawkApiError(
      response.status,
      payload?.error ?? `RateHawk request failed (${response.status}).`,
    );
  }
  return payload ?? { status: response.ok ? "ok" : "error", data: null };
}

/** Convenience helper for endpoints where only the `data` object is needed. */
export async function ratehawkFetch<T>(path: string, body: unknown): Promise<T | null> {
  const payload = await ratehawkRequest<T>(path, body);
  return payload.data ?? null;
}
