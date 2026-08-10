/**
 * Sandbox-only RateHawk client.
 *
 * Reads credentials from project secrets and makes authenticated HTTP Basic Auth
 * requests to https://api-sandbox.worldota.net.
 */

const SANDBOX_BASE_URL = "https://api-sandbox.worldota.net";

export class RateHawkAuthError extends Error {
  constructor() {
    super("RateHawk credentials are missing from project secrets.");
    this.name = "RateHawkAuthError";
  }
}

export class RateHawkApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "RateHawkApiError";
  }
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

  if (!username || !password) {
    throw new RateHawkAuthError();
  }

  return { username, password };
}

export type RateHawkResponse<T> = {
  status?: string;
  data?: T | null;
  error?: string | null;
  debug?: unknown;
};

/**
 * POST an authenticated request to the RateHawk sandbox API.
 */
export async function ratehawkFetch<T>(
  path: string,
  body: unknown,
): Promise<T | null> {
  const { username, password } = readCredentials();

  const url = `${SANDBOX_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(username, password),
      Accept: "application/json",
      "Content-Type": "application/json",
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

  return payload?.data ?? null;
}
