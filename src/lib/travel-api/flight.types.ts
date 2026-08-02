/** Flight API data contracts. Types are erased at runtime and safe to import anywhere. */

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

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
  flightNumber: string;
  departureTime: string; // ISO 8601 datetime
  arrivalTime: string; // ISO 8601 datetime
  duration: string; // human readable, e.g. "2h 30m"
  stops: number;
  price: number;
  currency: string;
};
