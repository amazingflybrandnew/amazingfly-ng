/**
 * Server-only Duffel flight API client.
 *
 * This module is kept out of the client bundle by the `.server.ts` naming
 * convention. Credentials are read inside function bodies from `process.env`
 * and are never exposed to the frontend.
 */

import type {
  CabinClass,
  FlightPassengers,
  FlightResult,
  FlightSearchRequest,
} from "./flight.types";

type DuffelCredentials = { baseUrl: string; token: string };

function readCredentials(): DuffelCredentials {
  const baseUrl = process.env["DUFFEL_API_BASE_URL"] || "https://api.duffel.com";
  const token = process.env["DUFFEL_API_TOKEN"] || process.env["FLIGHT_API_KEY"];

  if (!token) {
    throw new Error(
      "Flight search is not configured yet. Missing DUFFEL_API_TOKEN.",
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}

async function duffelFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const { baseUrl, token } = readCredentials();

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2",
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    },
    ...(init.body ? { body: JSON.stringify({ data: init.body }) } : {}),
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; errors?: { title?: string; message?: string }[] }
    | null;

  if (!response.ok) {
    const first = payload?.errors?.[0];
    throw new Error(
      first?.message || first?.title || `Duffel request failed (${response.status}).`,
    );
  }
  return (payload?.data ?? null) as T;
}

/** Converts an ISO-8601 duration such as "PT7H35M" into total minutes. */
function durationToMinutes(iso: string | null | undefined): number {
  if (!iso) return 0;
  const match = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!match) return 0;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return days * 24 * 60 + hours * 60 + minutes;
}

/** Converts an ISO-8601 duration such as "PT7H35M" into "7h 35m". */
function formatDuration(iso: string | null | undefined): string {
  const total = durationToMinutes(iso);
  if (!total) return "—";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""].filter(Boolean).join(" ");
}


type DuffelSegment = {
  origin?: { iata_code?: string };
  destination?: { iata_code?: string };
  departing_at?: string;
  arriving_at?: string;
  marketing_carrier?: { name?: string; iata_code?: string; logo_symbol_url?: string };
  marketing_carrier_flight_number?: string;
  passengers?: { cabin_class?: string }[];
};

type DuffelSlice = {
  duration?: string;
  origin?: { iata_code?: string };
  destination?: { iata_code?: string };
  segments?: DuffelSegment[];
};

type DuffelOffer = {
  id: string;
  total_amount?: string;
  total_currency?: string;
  owner?: { name?: string; iata_code?: string; logo_symbol_url?: string };
  slices?: DuffelSlice[];
};

function buildPassengerPayload(passengers: FlightPassengers) {
  const list: { type?: string; age?: number }[] = [];
  for (let i = 0; i < Math.max(1, passengers.adults); i += 1) list.push({ type: "adult" });
  for (let i = 0; i < (passengers.children ?? 0); i += 1) list.push({ age: 10 });
  for (let i = 0; i < (passengers.infants ?? 0); i += 1) list.push({ age: 1 });
  return list;
}

function mapOffer(offer: DuffelOffer, request: FlightSearchRequest): FlightResult {
  const slice = offer.slices?.[0];
  const segments = slice?.segments ?? [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  const carrier = first?.marketing_carrier ?? offer.owner;

  return {
    id: offer.id,
    airline: carrier?.name ?? offer.owner?.name ?? "Airline",
    airlineLogoUrl: carrier?.logo_symbol_url ?? offer.owner?.logo_symbol_url ?? null,
    flightNumber: `${carrier?.iata_code ?? ""}${first?.marketing_carrier_flight_number ?? ""}`.trim(),
    origin: slice?.origin?.iata_code ?? first?.origin?.iata_code ?? request.origin,
    destination:
      slice?.destination?.iata_code ?? last?.destination?.iata_code ?? request.destination,
    departureTime: first?.departing_at ?? request.departureDate,
    arrivalTime: last?.arriving_at ?? request.departureDate,
    duration: formatDuration(slice?.duration),
    durationMinutes: durationToMinutes(slice?.duration),

    stops: Math.max(0, segments.length - 1),
    cabinClass: (first?.passengers?.[0]?.cabin_class as CabinClass) ?? request.cabinClass,
    passengers: request.passengers,
    price: Number(offer.total_amount ?? 0),
    currency: offer.total_currency ?? "NGN",
  };
}

/** Search Duffel for flight offers matching the request criteria. */
export async function searchFlights(
  request: FlightSearchRequest,
): Promise<FlightResult[]> {
  const slices = [
    {
      origin: request.origin.toUpperCase(),
      destination: request.destination.toUpperCase(),
      departure_date: request.departureDate,
    },
    ...(request.returnDate
      ? [
          {
            origin: request.destination.toUpperCase(),
            destination: request.origin.toUpperCase(),
            departure_date: request.returnDate,
          },
        ]
      : []),
  ];

  const data = await duffelFetch<{ offers?: DuffelOffer[] }>(
    "/air/offer_requests?return_offers=true&supplier_timeout=20000",
    {
      method: "POST",
      body: {
        slices,
        passengers: buildPassengerPayload(request.passengers),
        cabin_class: request.cabinClass,
      },
    },
  );

  const offers = data?.offers ?? [];
  return offers
    .map((offer) => mapOffer(offer, request))
    .sort((a, b) => a.price - b.price)
    .slice(0, 30);
}

/** Fetch the full offer record for a single Duffel offer id. */
export async function getFlightDetails(
  flightId: string,
): Promise<FlightResult | null> {
  const offer = await duffelFetch<DuffelOffer | null>(
    `/air/offers/${encodeURIComponent(flightId)}?return_available_services=false`,
    { method: "GET" },
  );
  if (!offer) return null;

  const slice = offer.slices?.[0];
  const fallback: FlightSearchRequest = {
    origin: slice?.origin?.iata_code ?? "",
    destination: slice?.destination?.iata_code ?? "",
    departureDate: slice?.segments?.[0]?.departing_at ?? "",
    passengers: { adults: 1 },
    cabinClass: "economy",
  };
  return mapOffer(offer, fallback);
}

// ---------------------------------------------------------------------------
// Offer capabilities (fare conditions, baggage, hold support) and hold orders.
// Everything below reads ONLY what Duffel returns — no invented fare rules.
// ---------------------------------------------------------------------------

import type { FlightOfferInfo, FareRule } from "./flight-offer.types";

type DuffelCondition = {
  allowed?: boolean;
  penalty_amount?: string | null;
  penalty_currency?: string | null;
} | null;

type DuffelOfferFull = DuffelOffer & {
  expires_at?: string;
  passenger_identity_documents_required?: boolean;
  conditions?: {
    refund_before_departure?: DuffelCondition;
    change_before_departure?: DuffelCondition;
  };
  payment_requirements?: {
    requires_instant_payment?: boolean;
    payment_required_by?: string | null;
    price_guarantee_expires_at?: string | null;
  };
  passengers?: { id?: string }[];
  slices?: (DuffelSlice & {
    fare_brand_name?: string | null;
    segments?: (DuffelSegment & {
      passengers?: {
        cabin_class?: string;
        cabin_class_marketing_name?: string | null;
        baggages?: { type?: string; quantity?: number }[];
      }[];
    })[];
  })[];
};

function mapCondition(condition: DuffelCondition): FareRule {
  if (!condition || condition.allowed === undefined || condition.allowed === null) return null;
  const amount = condition.penalty_amount ? Number(condition.penalty_amount) : null;
  return {
    allowed: Boolean(condition.allowed),
    penaltyAmount: Number.isFinite(amount as number) ? (amount as number) : null,
    penaltyCurrency: condition.penalty_currency ?? null,
  };
}

/** Reads fare conditions, baggage and hold capability for a Duffel offer. */
export async function getOfferInfo(offerId: string): Promise<FlightOfferInfo | null> {
  const offer = await duffelFetch<DuffelOfferFull | null>(
    `/air/offers/${encodeURIComponent(offerId)}?return_available_services=false`,
    { method: "GET" },
  );
  if (!offer) return null;

  const segmentPassenger = offer.slices?.[0]?.segments?.[0]?.passengers?.[0];
  const baggages = segmentPassenger?.baggages ?? [];
  const checked = baggages.find((bag) => bag.type === "checked")?.quantity;
  const carryOn = baggages.find((bag) => bag.type === "carry_on")?.quantity;

  return {
    offerId: offer.id,
    expiresAt: offer.expires_at ?? null,
    refund: mapCondition(offer.conditions?.refund_before_departure ?? null),
    change: mapCondition(offer.conditions?.change_before_departure ?? null),
    baggage: {
      checked: typeof checked === "number" ? checked : null,
      carryOn: typeof carryOn === "number" ? carryOn : null,
    },
    cabinMarketingName: segmentPassenger?.cabin_class_marketing_name ?? null,
    fareBrandName: offer.slices?.[0]?.fare_brand_name ?? null,
    passportRequired: Boolean(offer.passenger_identity_documents_required),
    supportsHold: offer.payment_requirements?.requires_instant_payment === false,
    paymentRequiredBy: offer.payment_requirements?.payment_required_by ?? null,
    priceGuaranteeExpiresAt: offer.payment_requirements?.price_guarantee_expires_at ?? null,
    passengerIds: (offer.passengers ?? []).map((passenger) => String(passenger.id ?? "")).filter(Boolean),
  };
}

export type HoldOrderPassenger = {
  id: string;
  title: string;
  given_name: string;
  family_name: string;
  born_on: string;
  gender: string;
  email: string;
  phone_number: string;
};

export type HoldOrderResult = {
  orderId: string;
  bookingReference: string | null;
  paymentRequiredBy: string | null;
  awaitingPayment: boolean;
};

/**
 * Creates a Duffel `hold` order (no payment taken). Only call this after
 * `getOfferInfo().supportsHold` is true for the offer.
 */
export async function createHoldOrder(input: {
  offerId: string;
  passengers: HoldOrderPassenger[];
  amount: number;
  currency: string;
}): Promise<HoldOrderResult> {
  const order = await duffelFetch<{
    id: string;
    booking_reference?: string | null;
    awaiting_payment?: boolean;
    payment_status?: { payment_required_by?: string | null; awaiting_payment?: boolean };
  }>("/air/orders", {
    method: "POST",
    body: {
      type: "hold",
      selected_offers: [input.offerId],
      passengers: input.passengers,
    },
  });

  return {
    orderId: order.id,
    bookingReference: order.booking_reference ?? null,
    paymentRequiredBy: order.payment_status?.payment_required_by ?? null,
    awaitingPayment: order.payment_status?.awaiting_payment ?? order.awaiting_payment ?? true,
  };
}
