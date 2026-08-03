/**
 * Server-only customer payment currency layer.
 *
 * WHY THIS EXISTS
 * ---------------
 * Duffel quotes flight offers in the airline's own currency (very often USD),
 * and RateHawk quotes hotels in their contract currency. Paystack, however,
 * only accepts the currencies enabled on the merchant account — for a Nigerian
 * account that is normally NGN alone, and initializing a USD charge fails with
 * a "currency not supported" validation error.
 *
 * So we split the two concepts:
 *   - BOOKING currency  → what the supplier (Duffel / RateHawk) must be paid in.
 *                         Never touched here; it stays on `service_requests`.
 *   - SETTLEMENT currency → what the customer is charged through Paystack.
 *
 * Conversion is applied ONLY to the customer charge. The airline booking still
 * uses the original offer amount and currency.
 *
 * Configuration (all optional):
 *   PAYSTACK_SUPPORTED_CURRENCIES  e.g. "NGN" or "NGN,USD"     (default "NGN")
 *   PAYMENT_SETTLEMENT_CURRENCY    charge currency             (default "NGN")
 *   PAYMENT_FX_MARKUP_PERCENT      FX buffer, e.g. "2.5"       (default 0)
 *   PAYMENT_FX_RATE_USD_NGN        manual rate override (any PAIR works:
 *                                  PAYMENT_FX_RATE_<FROM>_<TO>)
 */

const DEFAULT_SETTLEMENT = "NGN";
const RATE_API = "https://open.er-api.com/v6/latest";

export type FxConversion = {
  /** Amount the customer is actually charged. */
  amount: number;
  /** Currency the customer is actually charged in (Paystack-supported). */
  currency: string;
  /** Original supplier amount — what the airline/hotel is paid. */
  sourceAmount: number;
  sourceCurrency: string;
  /** 1 sourceCurrency = rate settlementCurrency (markup already applied). */
  rate: number;
  markupPercent: number;
  converted: boolean;
  rateSource: "none" | "manual" | "live";
};

export type FxResult = { ok: true; conversion: FxConversion } | { ok: false; message: string };

function envList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  return raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

function envNumber(name: string): number | null {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return null;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Currencies the Paystack merchant account can actually charge in. */
export function supportedPaystackCurrencies(): string[] {
  return envList("PAYSTACK_SUPPORTED_CURRENCIES", [DEFAULT_SETTLEMENT]);
}

/** The currency Nigerian customers are charged in when conversion is needed. */
export function settlementCurrency(): string {
  const configured = process.env["PAYMENT_SETTLEMENT_CURRENCY"];
  const value = configured && configured.trim() ? configured.trim().toUpperCase() : DEFAULT_SETTLEMENT;
  return value;
}

export function isPaystackSupportedCurrency(currency: string): boolean {
  return supportedPaystackCurrencies().includes(currency.trim().toUpperCase());
}

/** Live mid-market rate, used only when no manual rate is configured. */
async function fetchLiveRate(from: string, to: string): Promise<number | null> {
  try {
    const response = await fetch(`${RATE_API}/${encodeURIComponent(from)}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      console.error("[fx] rate api http", response.status);
      return null;
    }
    const payload = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const rate = payload.rates?.[to];
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch (error) {
    console.error("[fx] rate api error", error);
    return null;
  }
}

/**
 * Resolves what the customer should be charged for a supplier-priced booking.
 * Returns the original amount untouched when the currency is already supported.
 */
export async function resolveCustomerCharge(
  sourceAmount: number,
  sourceCurrencyRaw: string,
): Promise<FxResult> {
  const sourceCurrency = (sourceCurrencyRaw || DEFAULT_SETTLEMENT).trim().toUpperCase();

  if (!(sourceAmount > 0)) {
    return { ok: false, message: "This booking has no amount payable yet." };
  }

  if (isPaystackSupportedCurrency(sourceCurrency)) {
    return {
      ok: true,
      conversion: {
        amount: sourceAmount,
        currency: sourceCurrency,
        sourceAmount,
        sourceCurrency,
        rate: 1,
        markupPercent: 0,
        converted: false,
        rateSource: "none",
      },
    };
  }

  const target = settlementCurrency();
  const manual = envNumber(`PAYMENT_FX_RATE_${sourceCurrency}_${target}`);
  const live = manual ?? (await fetchLiveRate(sourceCurrency, target));

  if (!live) {
    console.error("[fx] no rate available", { sourceCurrency, target });
    return {
      ok: false,
      message: `We could not convert this ${sourceCurrency} fare to ${target} for payment. Please contact support.`,
    };
  }

  const markupPercent = envNumber("PAYMENT_FX_MARKUP_PERCENT") ?? 0;
  const rate = live * (1 + markupPercent / 100);
  // Charge whole units in NGN-style currencies — kobo fractions confuse customers.
  const amount = Math.ceil(sourceAmount * rate);

  return {
    ok: true,
    conversion: {
      amount,
      currency: target,
      sourceAmount,
      sourceCurrency,
      rate,
      markupPercent,
      converted: true,
      rateSource: manual ? "manual" : "live",
    },
  };
}
