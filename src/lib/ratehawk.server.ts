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

/** Return the full ETG response envelope so booking status is not discarded. */
export async function ratehawkRequest<T>(
  path: string,
  body: unknown,
): Promise<RateHawkResponse<T>> {
  const { username, password } = readCredentials();
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(username, password),
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Amazingfly/1.0 (RateHawk B2B v3)",
    },
    body: JSON.stringify(body ?? {}),
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
