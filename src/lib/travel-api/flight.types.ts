/** Flight API data contracts. Types are erased at runtime and safe to import anywhere. */

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export const CABIN_CLASSES: { value: CabinClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

export type FlightPassengers = {
  adults: number;
  children?: number;
  infants?: number;
};

export type FlightSearchRequest = {
  origin: string; // IATA code or city name
  destination: string; // IATA code or city name
  departureDate: string; // ISO 8601 date, e.g. 2026-08-15
  returnDate?: string; // ISO 8601 date; omit for one-way
  passengers: FlightPassengers;
  cabinClass: CabinClass;
};

export type FlightResult = {
  id: string; // unique offer/segment id for detail lookups
  airline: string;
  airlineLogoUrl?: string | null;
  flightNumber: string;
  origin: string; // IATA code
  destination: string; // IATA code
  departureTime: string; // ISO 8601 datetime
  arrivalTime: string; // ISO 8601 datetime
  duration: string; // human readable, e.g. "2h 30m"
  durationMinutes: number; // total journey length in minutes, used for sorting
  stops: number;
  cabinClass: CabinClass;

  passengers: FlightPassengers;
  price: number;
  currency: string;
};

export type FlightSearchResponse =
  | { ok: true; results: FlightResult[] }
  | { ok: false; error: string };
