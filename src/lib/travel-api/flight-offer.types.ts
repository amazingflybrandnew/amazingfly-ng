/**
 * Client-safe contracts describing what Duffel tells us about a selected offer.
 * Everything here is optional on purpose: when Duffel returns `null` for a
 * condition we show a graceful fallback instead of inventing airline rules.
 */

export const FARE_FALLBACK = "Fare conditions provided by the airline after booking.";
export const INFO_FALLBACK = "Information provided by airline after booking confirmation.";

export type FareRule = {
  allowed: boolean;
  penaltyAmount: number | null;
  penaltyCurrency: string | null;
} | null;

export type BaggageAllowance = {
  checked: number | null;
  carryOn: number | null;
};

export type FlightOfferInfo = {
  offerId: string;
  expiresAt: string | null;
  /** null = Duffel did not tell us; show the fallback copy. */
  refund: FareRule;
  change: FareRule;
  baggage: BaggageAllowance;
  cabinMarketingName: string | null;
  fareBrandName: string | null;
  passportRequired: boolean;
  /** true when the airline lets us create a `hold` order (pay later). */
  supportsHold: boolean;
  paymentRequiredBy: string | null;
  priceGuaranteeExpiresAt: string | null;
  passengerIds: string[];
};

export type FlightOfferInfoResponse =
  | { ok: true; info: FlightOfferInfo }
  | { ok: false; error: string };

/** Human label for a Duffel fare rule, never inventing conditions. */
export function fareRuleLabel(rule: FareRule, kind: "refund" | "change"): string {
  if (!rule) return FARE_FALLBACK;
  const noun = kind === "refund" ? "Refundable" : "Changeable";
  const negative = kind === "refund" ? "Non-refundable" : "Changes not permitted";
  if (!rule.allowed) return negative;
  if (rule.penaltyAmount && rule.penaltyAmount > 0) {
    return `${noun} — airline penalty ${rule.penaltyCurrency ?? ""} ${rule.penaltyAmount.toLocaleString()}`.trim();
  }
  return `${noun} — no airline penalty`;
}
