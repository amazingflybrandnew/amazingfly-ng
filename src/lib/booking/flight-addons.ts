export const FLIGHT_ADD_ONS = [
  {
    id: "priority_support",
    name: "Priority booking support",
    description: "Priority help before departure and faster support for this booking.",
    priceNgn: 7500,
  },
  {
    id: "change_assistance",
    name: "Flight-change assistance",
    description: "We handle your change request. Airline penalties and fare differences are separate.",
    priceNgn: 10000,
  },
  {
    id: "refund_assistance",
    name: "Cancellation & refund assistance",
    description: "We manage an eligible cancellation/refund request. Airline deductions remain separate.",
    priceNgn: 10000,
  },
  {
    id: "travel_alerts",
    name: "Travel alerts & check-in reminders",
    description: "Flight reminders and proactive support around online check-in.",
    priceNgn: 5000,
  },
] as const;

export type FlightAddOnId = (typeof FLIGHT_ADD_ONS)[number]["id"];

export function normalizeFlightAddOns(value: unknown): FlightAddOnId[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(FLIGHT_ADD_ONS.map((item) => item.id));
  return [...new Set(value.map(String).filter((id): id is FlightAddOnId => allowed.has(id)))];
}

export function flightAddOnTotal(ids: readonly FlightAddOnId[]): number {
  const selected = new Set(ids);
  return FLIGHT_ADD_ONS.reduce((total, item) => total + (selected.has(item.id) ? item.priceNgn : 0), 0);
}
