/**
 * Travel-insurance provider adapter.
 *
 * Amazingfly currently sources travel-insurance premiums manually (the team
 * books through an insurer such as AXA Mansard or Allianz and quotes the
 * customer), so the default provider here is "manual": it returns no automatic
 * price and defers to the admin quotation flow.
 *
 * This interface exists so a live insurer/aggregator API (AXA Mansard, Allianz
 * or an aggregator such as MyCover.ai) can be added later as a drop-in
 * implementation WITHOUT touching the request or checkout flow. To add one:
 *   1. Implement `InsuranceProvider` (fill in `getQuote`, optionally
 *      `issueCertificate`).
 *   2. Register it in `INSURANCE_PROVIDER_REGISTRY` under its id.
 *   3. Point `ACTIVE_INSURANCE_PROVIDER_ID` at it (or select per request).
 * Nothing on the launch path should ever depend on such an API being ready —
 * the manual provider always works.
 */

/** Insurers Amazingfly books through. Shared by the admin quotation form. */
export const INSURANCE_PROVIDERS = [
  { id: "axa-mansard", label: "AXA Mansard" },
  { id: "allianz", label: "Allianz" },
  { id: "other", label: "Other" },
] as const;

export type InsuranceProviderId = (typeof INSURANCE_PROVIDERS)[number]["id"];

export function insuranceProviderLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return INSURANCE_PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

export interface InsuranceQuoteRequest {
  destinationCountry?: string | null;
  purposeOfTravel?: string | null;
  coverStartDate?: string | null;
  coverEndDate?: string | null;
  travellersCount?: number | null;
}

/**
 * A quote result. `mode: "manual"` means no automatic price is available and an
 * admin must issue the quotation. `mode: "priced"` carries an API-returned
 * premium once a live provider is wired in.
 */
export type InsuranceQuote =
  | { mode: "manual"; message: string }
  | {
      mode: "priced";
      amount: number;
      currency: string;
      providerId: InsuranceProviderId;
      productName?: string;
      expiresAt?: string;
    };

export interface InsuranceProvider {
  id: InsuranceProviderId | "manual";
  label: string;
  /** Returns a premium, or a manual result when pricing must be done by staff. */
  getQuote(request: InsuranceQuoteRequest): Promise<InsuranceQuote>;
  /** Optional: issue/download the policy certificate once a provider supports it. */
  issueCertificate?(policyReference: string): Promise<{ certificateUrl: string }>;
}

/** Default provider: staff source the premium and quote through the admin panel. */
export const manualInsuranceProvider: InsuranceProvider = {
  id: "manual",
  label: "Manual quotation",
  async getQuote() {
    return {
      mode: "manual",
      message:
        "Travel insurance is quoted after review. Our team confirms the premium with the insurer and sends a personalised quotation.",
    };
  },
};

/**
 * Registry of available providers, keyed by id. Live API providers are added
 * here later; the manual provider is always present as the fallback.
 */
export const INSURANCE_PROVIDER_REGISTRY: Record<string, InsuranceProvider> = {
  manual: manualInsuranceProvider,
};

/** The provider used for automatic pricing. "manual" until an API is wired in. */
export const ACTIVE_INSURANCE_PROVIDER_ID: string = "manual";

export function getInsuranceProvider(
  id: string = ACTIVE_INSURANCE_PROVIDER_ID,
): InsuranceProvider {
  return INSURANCE_PROVIDER_REGISTRY[id] ?? manualInsuranceProvider;
}
