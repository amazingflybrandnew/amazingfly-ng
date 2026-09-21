/**
 * Server-only Sanlam Allianz travel insurance client.
 *
 * Self-contained: it does not import from the flight or hotel modules. It only
 * follows the same repo conventions (env-driven config, sandbox default,
 * credentials from project secrets — never the browser or git).
 *
 * Confirmed by live testing against the test environment:
 *  - Login:    POST /token  (x-www-form-urlencoded: username, password,
 *              grant_type=password) -> { access_token, expires_in, ... }
 *  - Purchase: POST /api/IndividualBooking -> bare policy string ("VASNGS...")
 *  - Booking dates use `dd-MMM-yyyy`; the quote used ISO datetimes.
 *
 *  - Quote:    POST /api/Quote -> quote with QuoteRequestId (integer) + premium.
 *
 * Nothing here runs until the ALLIANZ_* secrets are configured, so the rest of
 * the site is unaffected.
 */

import type {
  AllianzBookingResult,
  AllianzIndividualBooking,
  AllianzLookupItem,
  AllianzQuoteRequest,
  AllianzQuoteResponse,
} from "./allianz.types";

export type AllianzEnvironment = "sandbox" | "production";

const SANDBOX_BASE_URL = "https://web-app.sanlamallianz.com.ng/traveltest";

export class AllianzAuthError extends Error {
  constructor() {
    super("Sanlam Allianz credentials are missing from project secrets.");
    this.name = "AllianzAuthError";
  }
}

export class AllianzApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AllianzApiError";
  }
}

export function allianzEnvironment(): AllianzEnvironment {
  return process.env["ALLIANZ_ENVIRONMENT"]?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function isAllianzSandbox(): boolean {
  return allianzEnvironment() === "sandbox";
}

function baseUrl(): string {
  const configured = process.env["ALLIANZ_API_BASE_URL"]?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  // Only the test host has been shared so far; require an explicit base URL for
  // production so we never call the wrong host by accident.
  if (allianzEnvironment() === "production") {
    throw new AllianzApiError(0, "ALLIANZ_API_BASE_URL must be set for production.");
  }
  return SANDBOX_BASE_URL;
}

function readCredentials(): { username: string; password: string } {
  const username = process.env["ALLIANZ_USERNAME"];
  const password = process.env["ALLIANZ_PASSWORD"];
  if (!username || !password) throw new AllianzAuthError();
  return { username, password };
}

// Simple in-process token cache. The token is valid ~24h; we refresh a minute
// early. This lives for the life of the server process only.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const { username, password } = readCredentials();
  const body = new URLSearchParams({ username, password, grant_type: "password" });

  const response = await fetch(`${baseUrl()}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string }
    | null;

  if (!response.ok || !data?.access_token) {
    cachedToken = null;
    throw new AllianzApiError(
      response.status,
      data?.error_description ?? `Sanlam Allianz login failed (${response.status}).`,
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/** Format an ISO `yyyy-mm-dd` (or Date) as the booking API's `dd-MMM-yyyy`. */
export function toAllianzDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  if (Number.isNaN(date.getTime())) {
    throw new AllianzApiError(0, `Invalid date for Sanlam Allianz: ${String(value)}`);
  }
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day}-${months[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

/** Authenticated JSON request. Returns the raw response text for the caller. */
async function allianzRequest(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<{ status: number; text: string }> {
  const token = await getAccessToken();
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  if (!response.ok) {
    // Surface the API's own message. ASP.NET wraps the useful detail in
    // ExceptionMessage / StackTrace, so include those for diagnosis.
    let message = `Sanlam Allianz request failed (${response.status}).`;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const parts = [
        parsed["Message"],
        parsed["ExceptionMessage"],
        parsed["error_description"],
        typeof parsed["StackTrace"] === "string"
          ? String(parsed["StackTrace"]).split("\n")[0]
          : null,
      ].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
      if (parts.length) message = parts.join(" | ");
    } catch {
      if (text.trim()) message = text.trim().slice(0, 400);
    }
    throw new AllianzApiError(response.status, message);
  }
  return { status: response.status, text };
}

/**
 * Step 1 — request a quote. Returns QuoteRequestId (reused as the booking's
 * QuoteId) plus the premium.
 */
export async function getAllianzQuote(
  request: AllianzQuoteRequest,
): Promise<AllianzQuoteResponse> {
  const { text } = await allianzRequest("/api/Quote", "POST", request);
  return JSON.parse(text) as AllianzQuoteResponse;
}

/** Pull the contract/policy reference out of whatever shape booking returns. */
function extractContractNo(text: string): AllianzBookingResult {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") return parsed.trim();
    if (parsed && typeof parsed === "object") {
      const rec = parsed as Record<string, unknown>;
      const value = rec["ContractNo"] ?? rec["ContractNumber"] ?? rec["Data"];
      if (typeof value === "string") return value.trim();
    }
  } catch {
    /* not JSON — use raw text below */
  }
  return text.trim().replace(/^"|"$/g, "");
}

/**
 * Step 2 — create an individual booking against a QuoteId (the integer
 * QuoteRequestId from the quote). Returns the policy/contract reference.
 * The doc returns { ContractNo }; the live test returned a bare string —
 * both are handled.
 */
export async function createAllianzBooking(
  booking: AllianzIndividualBooking,
): Promise<AllianzBookingResult> {
  const { text } = await allianzRequest("/api/IndividualBooking", "POST", booking);
  return extractContractNo(text);
}

/**
 * Family booking — an array of travellers (2 adults + 1–6 children), all
 * sharing the same QuoteId. Returns the policy/contract reference.
 */
export async function createAllianzFamilyBooking(
  travellers: AllianzIndividualBooking[],
): Promise<AllianzBookingResult> {
  const { text } = await allianzRequest("/api/FamilyBooking", "POST", travellers);
  return extractContractNo(text);
}

// ---- Lookups (GET, behind the token) --------------------------------------
// Small, stable reference lists. Cached in-process for the server's lifetime.

const lookupCache = new Map<string, { value: AllianzLookupItem[]; expiresAt: number }>();
const LOOKUP_TTL_MS = 6 * 60 * 60 * 1000; // 6h

/**
 * Normalise a lookup row to { id, name }. `idKey` is the exact id field for this
 * lookup (e.g. "StateId") so we never mis-pick another *Id field (like a nested
 * CountryId), which would send a wrong id and make the booking crash.
 */
function normalizeLookupRow(row: unknown, idKey: string): AllianzLookupItem | null {
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  const name = rec["Name"] ?? rec["name"] ?? rec["Description"];
  let id: unknown =
    rec[idKey] ??
    rec["Id"] ??
    rec["id"] ??
    Object.entries(rec).find(([k]) => /id$/i.test(k))?.[1];
  if (id == null) id = Object.values(rec).find((v) => typeof v === "number");
  if (typeof id !== "number" || typeof name !== "string") return null;
  return { id, name: name.trim() };
}

async function fetchLookup(path: string, idKey: string): Promise<AllianzLookupItem[]> {
  const cacheKey = `${idKey}:${path}`;
  const cached = lookupCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const { text } = await allianzRequest(path, "GET");
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed) ? parsed : [];
  const value = rows
    .map((row) => normalizeLookupRow(row, idKey))
    .filter((r): r is AllianzLookupItem => r !== null);

  lookupCache.set(cacheKey, { value, expiresAt: Date.now() + LOOKUP_TTL_MS });
  return value;
}

export const getAllianzGenders = () => fetchLookup("/api/lookup/GetGender", "GenderId");
export const getAllianzTitles = () => fetchLookup("/api/lookup/GetTitle", "TitleId");
export const getAllianzStates = () => fetchLookup("/api/lookup/GetState", "StateId");
export const getAllianzMaritalStatuses = () =>
  fetchLookup("/api/lookup/GetMaritalStatus", "MaritalStatusId");
export const getAllianzBookingTypes = () =>
  fetchLookup("/api/lookup/GetBookingType", "BookingTypeId");

/** Travel plans are country-specific. */
export const getAllianzTravelPlans = (countryId: number) =>
  fetchLookup(
    `/api/lookup/GetTravelPlan?countryId=${encodeURIComponent(countryId)}`,
    "TravelPlanId",
  );
