/**
 * Server-only ETG Payota client — "Create credit card token" (init_partners).
 *
 * In the credit-card (B2B2C) model, ETG charges OUR corporate card for the NET
 * tariff while we keep our markup. Before Start booking process with
 * payment_type.type = "now", we must register the corporate card here, passing
 * our own pay_uuid and init_uuid; the same two UUIDs then go into the finish
 * call. See ETG docs: integration-requirements §4.1 and create-credit-card-token.
 *
 * The corporate card lives only in project secrets and is read here — never
 * stored in the database, logged, or returned to the browser.
 */
import { etgAuthedPost } from "@/lib/ratehawk.server";

const DEFAULT_PAYOTA_BASE_URL = "https://api.payota.net";

function payotaBaseUrl(): string {
  return (
    process.env["PAYOTA_BASE_URL"]?.trim().replace(/\/+$/, "") || DEFAULT_PAYOTA_BASE_URL
  );
}

export type CorporateCard = {
  number: string;
  holder: string;
  /** 2-digit month, e.g. "01". */
  month: string;
  /** 2-digit year, e.g. "28". */
  year: string;
  cvc: string;
};

/** Reads the Amazingfly corporate card charged by ETG, from project secrets. */
export function readCorporateCard(): CorporateCard {
  const number = (process.env["RATEHAWK_CARD_NUMBER"] ?? "").replace(/\s+/g, "");
  const holder = (process.env["RATEHAWK_CARD_HOLDER"] ?? "").trim();
  let month = (process.env["RATEHAWK_CARD_MONTH"] ?? "").trim();
  let year = (process.env["RATEHAWK_CARD_YEAR"] ?? "").trim();
  const cvc = (process.env["RATEHAWK_CARD_CVC"] ?? "").trim();

  // Normalise to the 2-digit forms ETG expects ("01", "28").
  if (month.length === 1) month = `0${month}`;
  if (year.length === 4) year = year.slice(2);

  if (!number || !holder || !month || !year) {
    throw new Error(
      "The corporate card is not fully configured. Set RATEHAWK_CARD_NUMBER, RATEHAWK_CARD_HOLDER, RATEHAWK_CARD_MONTH and RATEHAWK_CARD_YEAR (and RATEHAWK_CARD_CVC if required).",
    );
  }
  return { number, holder, month, year, cvc };
}

export function corporateCardConfigured(): boolean {
  try {
    readCorporateCard();
    return true;
  } catch {
    return false;
  }
}

export type InitPartnersInput = {
  /** ETG order id from Create booking process. */
  objectId: string;
  /** Partner-generated UUID, unique per payment. */
  payUuid: string;
  /** Partner-generated UUID (external booking id). */
  initUuid: string;
  firstName: string;
  lastName: string;
  isCvcRequired: boolean;
  card: CorporateCard;
};

/**
 * Registers the corporate card for an order's payment. Throws on any Payota
 * error (invalid_card_number, luhn_algorithm_error, validation_error, …) with
 * the ETG error code in the message. Card data never leaves this call.
 */
export async function payotaInitPartners(input: InitPartnersInput): Promise<void> {
  const body: Record<string, unknown> = {
    object_id: input.objectId,
    pay_uuid: input.payUuid,
    init_uuid: input.initUuid,
    user_first_name: input.firstName,
    user_last_name: input.lastName,
    is_cvc_required: input.isCvcRequired,
    credit_card_data_core: {
      year: input.card.year,
      card_number: input.card.number,
      card_holder: input.card.holder,
      month: input.card.month,
    },
  };
  if (input.isCvcRequired) body["cvc"] = input.card.cvc;

  const res = await etgAuthedPost(`${payotaBaseUrl()}/api/public/v1/manage/init_partners`, body);
  const json = res.json as { status?: string; error?: string } | null;
  if (!res.ok || json?.status !== "ok") {
    throw new Error(`Payota init_partners failed: ${json?.error || `HTTP ${res.status}`}`);
  }
}
