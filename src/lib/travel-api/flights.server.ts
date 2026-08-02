/**
 * Server-only flight API client.
 *
 * This module is intentionally kept out of the client bundle by the `.server.ts`
 * naming convention. API keys must be read inside handler bodies from
 * `process.env` and never exposed to the frontend.
 */

import type { FlightResult, FlightSearchRequest } from "./flight.types";

function assertEnvReady(): {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
} {
  const baseUrl = process.env["FLIGHT_API_BASE_URL"];
  const apiKey = process.env["FLIGHT_API_KEY"];
  const apiSecret = process.env["FLIGHT_API_SECRET"];

  if (!baseUrl || !apiKey || !apiSecret) {
    const missing = [
      ...(!baseUrl ? ["FLIGHT_API_BASE_URL"] : []),
      ...(!apiKey ? ["FLIGHT_API_KEY"] : []),
      ...(!apiSecret ? ["FLIGHT_API_SECRET"] : []),
    ];
    throw new Error(
      `Flight API credentials are not configured. Missing: ${missing.join(", ")}`
    );
  }

  return { baseUrl, apiKey, apiSecret };
}

/**
 * Search for available flights matching the request criteria.
 *
 * TODO: replace the stub with the actual provider request once credentials are
 * added and the endpoint contract is finalised.
 */
export async function searchFlights(
  request: FlightSearchRequest
): Promise<FlightResult[]> {
  // Credentials are read here so they never ship to the browser.
  const { baseUrl, apiKey, apiSecret } = assertEnvReady();

  console.log("[Flight API] searchFlights called", {
    request,
    baseUrl,
    apiKeyPresent: !!apiKey,
    apiSecretPresent: !!apiSecret,
  });

  // Placeholder: real implementation will POST /search to the provider.
  return [];
}

/**
 * Fetch detailed information for a single flight offer.
 *
 * TODO: replace the stub with the actual provider request once credentials are
 * added and the endpoint contract is finalised.
 */
export async function getFlightDetails(
  flightId: string
): Promise<FlightResult | null> {
  const { baseUrl, apiKey, apiSecret } = assertEnvReady();

  console.log("[Flight API] getFlightDetails called", {
    flightId,
    baseUrl,
    apiKeyPresent: !!apiKey,
    apiSecretPresent: !!apiSecret,
  });

  // Placeholder: real implementation will GET /details/{flightId}.
  return null;
}
