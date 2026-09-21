/**
 * Server-only Sanlam Allianz travel insurance client.
 *
 * Self-contained: it does not import from the flight or hotel modules. It only
 * follows the same repo conventions (env-driven config, sandbox default,
 * credentials from project secrets — never the browser or git).
 *
 * Fill in the two endpoint paths, the auth scheme and the lookup enums from the
 * Sanlam Allianz documentation where marked TODO. Nothing here runs until the
 * ALLIANZ_* secrets are configured, so the rest of the site is unaffected.
 */

import type {
  AllianzBookingResponse,
  AllianzIndividualBooking,
  AllianzQuoteRequest,
  AllianzQuoteResponse,
} from "./allianz.types";

export type AllianzEnvironment = "sandbox" | "production";

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
  if (!configured) {
    // TODO: add the documented sandbox/production base URLs as defaults once
    // confirmed. Kept required for now so a misconfiguration fails loudly
    // instead of silently calling the wrong host.
    throw new AllianzAuthError();
  }
  return configured;
}

/**
 * Auth header for a request.
 *
 * TODO: confirm the scheme from the documentation. The default assumes a
 * bearer API token (`ALLIANZ_API_TOKEN`). If the API instead uses an
 * `apikey`/`Ocp-Apim-Subscription-Key` header, basic auth, or a login endpoint
 * that returns a short-lived token, adjust this one function accordingly.
 */
function authHeaders(): Record<string, string> {
  const token = process.env["ALLIANZ_API_TOKEN"];
  if (!token) throw new AllianzAuthError();
  return { Authorization: `Bearer ${token}` };
}

/** Format an ISO `yyyy-mm-dd` (or Date) as the API's `dd-MMM-yyyy`. */
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

async function allianzRequest<T>(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    method,
    headers: {
      ...authHeaders(),
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as Record<string, unknown>)["message"])
        : null) ?? `Sanlam Allianz request failed (${response.status}).`;
    throw new AllianzApiError(response.status, message);
  }
  return payload as T;
}

/**
 * Step 1 — request a quote. Returns a QuoteId reused on booking, plus premium.
 * TODO: set the real endpoint path and confirm the request/response shape.
 */
export async function getAllianzQuote(
  request: AllianzQuoteRequest,
): Promise<AllianzQuoteResponse> {
  return allianzRequest<AllianzQuoteResponse>(
    "/api/quote" /* TODO: real path */,
    "POST",
    request,
  );
}

/**
 * Step 2 — create an individual booking against a QuoteId.
 * TODO: set the real endpoint path and confirm the response shape.
 */
export async function createAllianzBooking(
  booking: AllianzIndividualBooking,
): Promise<AllianzBookingResponse> {
  return allianzRequest<AllianzBookingResponse>(
    "/api/booking/individual" /* TODO: real path */,
    "POST",
    booking,
  );
}
