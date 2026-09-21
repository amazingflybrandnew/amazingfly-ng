/**
 * Travel insurance (Sanlam Allianz) server flow: options -> quote -> pay -> issue.
 *
 * "Pay first, then issue": createInsuranceQuote prices the trip with Allianz,
 * saves the request + traveller details, and starts a pending Paystack payment.
 * After Paystack confirms, issuePaidInsurancePolicy (called from the payment
 * finalizer) books the policy with Allianz and stores the certificate reference.
 *
 * Self-contained to the insurance module; it does not touch flight or hotel.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  AllianzIndividualBooking,
  AllianzLookupItem,
  AllianzQuoteRequest,
} from "./allianz.types";
import { ALLIANZ_COUNTRIES, allianzCountryById } from "./allianz-countries";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

// --- Amazingfly markup -------------------------------------------------------
// Applied to every individual — inside a group each traveller is charged the
// flat fee, and the percentage is applied to the Allianz premium.
// Defaults: ₦5,000 per traveller + 10%. Overridable via env.
const DEFAULT_MARKUP_FLAT_PER_TRAVELLER = 5000;
const DEFAULT_MARKUP_PERCENT = 10;

function markupConfig(): { flatPer: number; percent: number } {
  const flatPer = Number(process.env["ALLIANZ_MARKUP_FLAT"]);
  const percent = Number(process.env["ALLIANZ_MARKUP_PERCENT"]);
  return {
    flatPer: Number.isFinite(flatPer) && flatPer >= 0 ? flatPer : DEFAULT_MARKUP_FLAT_PER_TRAVELLER,
    percent: Number.isFinite(percent) && percent >= 0 ? percent : DEFAULT_MARKUP_PERCENT,
  };
}

/** base = Allianz premium; returns the customer total with markup applied. */
function applyMarkup(
  base: number,
  travellerCount: number,
): { base: number; markup: number; total: number } {
  const { flatPer, percent } = markupConfig();
  const flat = flatPer * Math.max(1, travellerCount);
  const pct = Math.round((base * percent) / 100);
  const markup = flat + pct;
  return { base, markup, total: base + markup };
}

const nextOfKinSchema = z.object({
  full_name: z.string().trim().min(1).max(160),
  address: z.string().trim().min(1).max(300),
  relationship: z.string().trim().min(1).max(60),
  telephone: z.string().trim().min(1).max(40),
});

/** One traveller's details. Used for individual (1) and family (2 adults + kids). */
const travellerSchema = z.object({
  surname: z.string().trim().min(1).max(80),
  first_name: z.string().trim().min(1).max(80),
  middle_name: z.string().trim().max(80).optional().default(""),
  gender_id: z.number().int().positive(),
  title_id: z.number().int().positive(),
  date_of_birth: isoDate,
  email: z.string().trim().email().max(200),
  telephone: z.string().trim().min(1).max(40),
  state_id: z.number().int().positive(),
  address: z.string().trim().min(1).max(300),
  zip_code: z.string().trim().max(20).optional().default(""),
  nationality: z.string().trim().min(1).max(80),
  passport_no: z.string().trim().min(1).max(40),
  occupation: z.string().trim().min(1).max(80),
  marital_status_id: z.number().int().positive(),
  // The live Allianz booking dereferences NIN, so it is required (a null NIN
  // causes a server-side NullReferenceException at IndividualBooking).
  nin: z.string().trim().min(1, "NIN is required").max(20),
  pre_existing_medical_condition: z.boolean().default(false),
  medical_condition: z.string().trim().max(500).nullable().default(null),
  next_of_kin: nextOfKinSchema,
});

const quoteInputSchema = z
  .object({
    // Trip
    destination_country_id: z.number().int().positive(),
    cover_begins: isoDate,
    cover_ends: isoDate,
    purpose_of_travel: z.string().trim().min(1).max(120),
    travel_plan_id: z.number().int().positive(),
    booking_type_id: z.number().int().positive(),
    is_round_trip: z.boolean(),
    is_multi_trip: z.boolean(),
    // Adults (1+) and children (0-6, under 18). Chosen manually by the customer.
    no_of_people: z.number().int().min(1).max(9),
    no_of_children: z.number().int().min(0).max(6),
    // One entry per traveller (adults first, then children).
    travellers: z.array(travellerSchema).min(1).max(15),
    consent_to_contact: z.literal(true),
  })
  .strict()
  .refine((d) => d.travellers.length === d.no_of_people + d.no_of_children, {
    message: "The number of traveller details must match the number of people and children.",
    path: ["travellers"],
  });

export type InsuranceQuoteInput = z.infer<typeof quoteInputSchema>;

export type InsuranceQuoteResult =
  | { ok: true; reference: string; requestId: string; amount: number; currency: string }
  | { ok: false; message: string };

export type InsuranceOptions = {
  countries: { id: number; name: string; region: number }[];
  genders: AllianzLookupItem[];
  titles: AllianzLookupItem[];
  states: AllianzLookupItem[];
  maritalStatuses: AllianzLookupItem[];
  bookingTypes: AllianzLookupItem[];
};

/** Lookups + countries for the insurance form. Lookups are cached server-side. */
export const getInsuranceOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<InsuranceOptions> => {
    const {
      getAllianzGenders,
      getAllianzTitles,
      getAllianzStates,
      getAllianzMaritalStatuses,
      getAllianzBookingTypes,
    } = await import("./allianz.server");

    const [genders, titles, states, maritalStatuses, bookingTypes] = await Promise.all([
      getAllianzGenders().catch(() => []),
      getAllianzTitles().catch(() => []),
      getAllianzStates().catch(() => []),
      getAllianzMaritalStatuses().catch(() => []),
      getAllianzBookingTypes().catch(() => []),
    ]);

    return {
      countries: ALLIANZ_COUNTRIES.map((c) => ({ id: c.id, name: c.name, region: c.region })),
      genders,
      titles,
      states,
      maritalStatuses,
      bookingTypes,
    };
  },
);

/** Country-specific travel plans for the chosen destination. */
export const getInsuranceTravelPlans = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ countryId: z.number().int().positive() }).parse(data))
  .handler(async ({ data }): Promise<AllianzLookupItem[]> => {
    const { getAllianzTravelPlans } = await import("./allianz.server");
    return getAllianzTravelPlans(data.countryId).catch(() => []);
  });

const previewSchema = z
  .object({
    destination_country_id: z.number().int().positive(),
    cover_begins: isoDate,
    cover_ends: isoDate,
    purpose_of_travel: z.string().trim().min(1).max(120),
    travel_plan_id: z.number().int().positive(),
    booking_type_id: z.number().int().positive(),
    is_round_trip: z.boolean(),
    is_multi_trip: z.boolean(),
    no_of_people: z.number().int().min(1).max(9).default(1),
    no_of_children: z.number().int().min(0).max(6).default(0),
    date_of_birth: isoDate,
    email: z.string().trim().email().max(200),
    telephone: z.string().trim().min(1).max(40),
  })
  .strict();

export type InsurancePreviewResult =
  | { ok: true; amount: number; currency: string; productVariantId: string | null }
  | { ok: false; message: string };

/** Price-only quote (no DB writes) so a customer can see the premium first. */
export const previewInsuranceQuote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => previewSchema.parse(data))
  .handler(async ({ data }): Promise<InsurancePreviewResult> => {
    const { getAllianzQuote, toAllianzDate } = await import("./allianz.server");
    try {
      const quote = await getAllianzQuote({
        DateOfBirth: toAllianzDate(data.date_of_birth),
        Email: data.email,
        Telephone: data.telephone,
        CoverBegins: toAllianzDate(data.cover_begins),
        CoverEnds: toAllianzDate(data.cover_ends),
        CountryId: data.destination_country_id,
        PurposeOfTravel: data.purpose_of_travel,
        TravelPlanId: data.travel_plan_id,
        BookingTypeId: data.booking_type_id,
        IsRoundTrip: data.is_round_trip,
        NoOfPeople: data.no_of_people,
        NoOfChildren: data.no_of_children,
        IsMultiTrip: data.is_multi_trip,
      });
      const base = Number(quote.Amount ?? 0);
      if (!Number.isFinite(base) || base <= 0) {
        return { ok: false, message: "Sanlam Allianz returned an invalid premium." };
      }
      // Markup is per traveller (adults + children).
      const { total } = applyMarkup(base, data.no_of_people + data.no_of_children);
      return {
        ok: true,
        amount: total,
        currency: "NGN",
        productVariantId: quote.ProductVariantId ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not price this trip.";
      return { ok: false, message: `Sanlam Allianz: ${message}` };
    }
  });

/**
 * Price the trip with Allianz, persist the request + traveller details, and
 * start a pending Paystack payment. The policy is only issued after payment.
 */
export const createInsuranceQuote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => quoteInputSchema.parse(data))
  .handler(async ({ data }): Promise<InsuranceQuoteResult> => {
    const { requireUser } = await import("../auth.server");
    const { user } = await requireUser();

    const country = allianzCountryById(data.destination_country_id);
    if (!country) return { ok: false, message: "Please choose a valid destination country." };

    const { getAllianzQuote, toAllianzDate } = await import("./allianz.server");

    const lead = data.travellers[0]!;

    // Allianz rule: all members of a family policy must share the same surname.
    if (data.travellers.length > 1) {
      const surname = lead.surname.trim().toLowerCase();
      if (!data.travellers.every((t) => t.surname.trim().toLowerCase() === surname)) {
        return {
          ok: false,
          message: "All family members must have the same surname (required by the insurer).",
        };
      }
    }

    // The exact quote request, stored so issuance can re-quote for a fresh
    // QuoteId (quotes can expire/be single-use between payment and issuance).
    const quoteRequest = {
      DateOfBirth: toAllianzDate(lead.date_of_birth),
      Email: lead.email,
      Telephone: lead.telephone,
      CoverBegins: toAllianzDate(data.cover_begins),
      CoverEnds: toAllianzDate(data.cover_ends),
      CountryId: data.destination_country_id,
      PurposeOfTravel: data.purpose_of_travel,
      TravelPlanId: data.travel_plan_id,
      BookingTypeId: data.booking_type_id,
      IsRoundTrip: data.is_round_trip,
      NoOfPeople: data.no_of_people,
      NoOfChildren: data.no_of_children,
      IsMultiTrip: data.is_multi_trip,
    };

    let quote;
    try {
      quote = await getAllianzQuote(quoteRequest);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not get a quote right now.";
      return { ok: false, message: `Sanlam Allianz: ${message}` };
    }

    const base = Number(quote.Amount ?? 0);
    if (!Number.isFinite(base) || base <= 0) {
      return { ok: false, message: "Sanlam Allianz returned an invalid premium. Please try again." };
    }
    // Customer pays the Allianz premium plus the Amazingfly markup (per traveller).
    const { total: amount } = applyMarkup(base, data.travellers.length);

    const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
    const supabase = createExternalSupabaseAdmin();

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("slug", "travel-insurance")
      .maybeSingle();

    const { generateRequestReference } = await import("../request-reference");
    const reference = generateRequestReference();
    const fullName = [lead.first_name, lead.middle_name, lead.surname]
      .filter(Boolean)
      .join(" ")
      .trim();

    // Each traveller's booking payload (replayed to Allianz after payment).
    const toPayload = (t: (typeof data.travellers)[number]): Omit<AllianzIndividualBooking, "QuoteId"> => ({
      Surname: t.surname,
      MiddleName: t.middle_name ?? "",
      FirstName: t.first_name,
      GenderId: t.gender_id,
      TitleId: t.title_id,
      DateOfBirth: toAllianzDate(t.date_of_birth),
      Email: t.email,
      Telephone: t.telephone,
      StateId: t.state_id,
      Address: t.address,
      ZipCode: t.zip_code ?? "",
      Nationality: t.nationality,
      PassportNo: t.passport_no,
      IdentificationPath: null,
      Occupation: t.occupation,
      Nin: t.nin,
      MaritalStatusId: t.marital_status_id,
      PreExistingMedicalCondition: t.pre_existing_medical_condition,
      MedicalCondition: t.medical_condition,
      NextOfKin: {
        FullName: t.next_of_kin.full_name,
        Address: t.next_of_kin.address,
        Relationship: t.next_of_kin.relationship,
        Telephone: t.next_of_kin.telephone,
      },
    });
    const travellerPayloads = data.travellers.map(toPayload);
    const travellerPayload = travellerPayloads[0]!;

    const baseRow: Record<string, unknown> = {
      request_reference: reference,
      service_id: service?.id ?? null,
      user_id: user.id,
      service_type: "Travel Insurance",
      destination_country: country.name,
      destination: country.name,
      travel_purpose: data.purpose_of_travel,
      travel_date: data.cover_begins,
      return_date: data.cover_ends,
      traveller_count: data.travellers.length,
      full_name: fullName,
      email: lead.email,
      phone: lead.telephone,
      passport_number: lead.passport_no,
      date_of_birth: lead.date_of_birth,
      request_details: `Travel insurance for ${country.name} (${data.cover_begins} to ${data.cover_ends}).`,
      preferred_contact: "email",
      consent_to_contact: true,
    };
    const dynamicRow: Record<string, unknown> = {
      ...baseRow,
      service_category: "insurance",
      amount,
      currency: "NGN",
      requires_quote: false,
      payment_status: "pending_payment",
    };

    let { data: request, error: requestError } = await supabase
      .from("service_requests")
      .insert(dynamicRow)
      .select("id")
      .maybeSingle();

    if (requestError?.code === "42703" || requestError?.code === "PGRST204") {
      ({ data: request, error: requestError } = await supabase
        .from("service_requests")
        .insert(baseRow)
        .select("id")
        .maybeSingle());
    }
    if (requestError || !request) {
      return { ok: false, message: requestError?.message ?? "Could not save the insurance request." };
    }

    const { error: quoteError } = await supabase.from("travel_insurance_quotes").insert({
      user_id: user.id,
      service_request_id: request.id,
      quote_request_id: String(quote.quoteId ?? quote.QuoteRequestId),
      allianz_quote_request_id: quote.QuoteRequestId,
      product_variant_id: quote.ProductVariantId ?? null,
      destination_country: country.name,
      allianz_country_id: data.destination_country_id,
      purpose_of_travel: data.purpose_of_travel,
      travel_plan_id: data.travel_plan_id,
      booking_type_id: data.booking_type_id,
      cover_start_date: data.cover_begins,
      cover_end_date: data.cover_ends,
      travellers_count: data.travellers.length,
      amount,
      allianz_price: quote.AllianzPrice ?? String(base),
      currency: "NGN",
      status: "quoted",
      traveller: travellerPayload,
      travellers: travellerPayloads,
      quote_request: quoteRequest,
    });
    if (quoteError) {
      return { ok: false, message: `Could not save the quote: ${quoteError.message}` };
    }

    const { createPendingTransaction } = await import("../payment/transactions.server");
    const created = await createPendingTransaction({
      user_id: user.id,
      request_id: request.id,
      amount,
      currency: "NGN",
      provider: "paystack",
      payment_type: "travel_service",
    });
    if (!created.ok) {
      // The request is saved; checkout can recreate the pending transaction.
      console.error("[insurance] pending transaction", created.message);
    }

    // Acknowledge the request by email (best-effort; never blocks checkout).
    try {
      const { sendTransactionalEmail } = await import("../email.server");
      await sendTransactionalEmail({
        to: lead.email,
        subject: `We've received your travel insurance request - ${reference}`,
        text: `Hello ${fullName},

Thanks for starting your travel insurance request with Amazingfly Travels.

Reference: ${reference}
Destination: ${country.name}
Cover: ${data.cover_begins} to ${data.cover_ends}
Amount: NGN ${amount.toLocaleString()}

Please complete payment to have your Sanlam Allianz policy issued. Your policy
certificate will be emailed to you once payment is confirmed.

Amazingfly Travels`,
        idempotencyKey: `insurance-received-${reference}`,
      });
    } catch (error) {
      console.error("[insurance] request-received email failed", error);
    }

    return { ok: true, reference, requestId: request.id, amount, currency: "NGN" };
  });

/**
 * Issue the policy after a verified payment. Idempotent by service_request_id.
 * Called from the Paystack finalizer. A supplier failure never reverses a
 * verified customer payment; it is flagged for manual attention instead.
 */
export async function issuePaidInsurancePolicy(requestId: string): Promise<void> {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  const supabase = createExternalSupabaseAdmin();

  const { data: existing } = await supabase
    .from("travel_insurance_policies")
    .select("id")
    .eq("service_request_id", requestId)
    .maybeSingle();
  if (existing) return; // already issued

  const { data: quoteRow } = await supabase
    .from("travel_insurance_quotes")
    .select(
      "id, user_id, allianz_quote_request_id, quote_request, traveller, travellers, amount, currency",
    )
    .eq("service_request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = (quoteRow as Record<string, unknown> | null) ?? null;
  const single = row?.["traveller"] as Omit<AllianzIndividualBooking, "QuoteId"> | null;
  const many = row?.["travellers"] as Omit<AllianzIndividualBooking, "QuoteId">[] | null;
  // Prefer the travellers array (family); fall back to the single traveller.
  const travellers = Array.isArray(many) && many.length > 0 ? many : single ? [single] : [];
  const storedQuoteRequest = row?.["quote_request"] as Record<string, unknown> | null;
  if (!row || travellers.length === 0) {
    console.error("[insurance] issue: missing stored quote/traveller for", requestId);
    return;
  }

  const { data: txRow } = await supabase
    .from("payment_transactions")
    .select("transaction_reference, amount")
    .eq("request_id", requestId)
    .eq("status", "successful")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const paymentReference = (txRow as Record<string, unknown> | null)?.["transaction_reference"] ?? null;

  const failIssue = async (stage: string, err: unknown) => {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[insurance] ${stage} failed for`, requestId, detail);
    await supabase
      .from("service_requests")
      .update({ booking_status: "needs_attention" })
      .eq("id", requestId);
    await supabase
      .from("travel_insurance_quotes")
      .update({ last_error: `${stage}: ${detail}`.slice(0, 1000) })
      .eq("id", row["id"]);
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "processing",
      message:
        "Payment received. Your travel insurance policy is being issued — our team will confirm shortly.",
    });
  };

  let contractNo: string;
  try {
    const { createAllianzBooking, createAllianzFamilyBooking, getAllianzQuote } = await import(
      "./allianz.server"
    );
    // Re-quote for a fresh QuoteId so a delay between payment and issuance (or a
    // single-use quote) can't cause the booking to fail. Fall back to the stored
    // QuoteId if a re-quote isn't possible.
    let quoteId = Number(row["allianz_quote_request_id"] ?? 0);
    if (storedQuoteRequest) {
      try {
        const fresh = await getAllianzQuote(storedQuoteRequest as unknown as AllianzQuoteRequest);
        if (fresh?.QuoteRequestId) quoteId = Number(fresh.QuoteRequestId);
      } catch (error) {
        await failIssue("Re-quote", error);
        return;
      }
    }
    if (!Number.isFinite(quoteId) || quoteId <= 0) {
      await failIssue("Booking", new Error("No valid QuoteId available for issuance."));
      return;
    }
    contractNo =
      travellers.length > 1
        ? await createAllianzFamilyBooking(travellers.map((t) => ({ QuoteId: quoteId, ...t })))
        : await createAllianzBooking({ QuoteId: quoteId, ...travellers[0]! });
  } catch (error) {
    await failIssue("Booking", error);
    return;
  }

  const { error: policyError } = await supabase.from("travel_insurance_policies").insert({
    user_id: (row["user_id"] as string | undefined) ?? null,
    quote_id: row["id"],
    service_request_id: requestId,
    contract_number: contractNo,
    policy_reference: contractNo,
    payment_reference: paymentReference,
    amount_paid: Number(row["amount"] ?? 0),
    currency: String(row["currency"] ?? "NGN"),
    policy_status: "issued",
  });
  if (policyError) console.error("[insurance] store policy", policyError.message);

  await supabase.from("travel_insurance_quotes").update({ status: "issued" }).eq("id", row["id"]);
  await supabase
    .from("service_requests")
    .update({ request_status: "completed", booking_status: "confirmed" })
    .eq("id", requestId);
  await supabase.from("request_updates").insert({
    request_id: requestId,
    status: "completed",
    message: `Travel insurance policy issued. Certificate/contract number: ${contractNo}.`,
  });

  // Email the customer a branded confirmation PDF (Allianz also emails the
  // official certificate). Never let an email failure affect issuance.
  try {
    const { data: srRow } = await supabase
      .from("service_requests")
      .select("email, full_name, destination_country, travel_date, return_date, request_reference")
      .eq("id", requestId)
      .maybeSingle();
    const sr = (srRow as Record<string, unknown> | null) ?? {};
    const email = String(sr["email"] ?? "");
    if (email) {
      const { createInsuranceCertificatePdf } = await import("./insurance-certificate-pdf");
      const amountPaid = Number(row["amount"] ?? 0);
      const currency = String(row["currency"] ?? "NGN");
      const pdf = createInsuranceCertificatePdf({
        contractNumber: contractNo,
        travellerName: String(sr["full_name"] ?? traveller.FirstName ?? ""),
        destination: String(sr["destination_country"] ?? ""),
        coverBegins: String(sr["travel_date"] ?? ""),
        coverEnds: String(sr["return_date"] ?? ""),
        amountPaid: `${currency} ${amountPaid.toLocaleString()}`,
        reference: String(sr["request_reference"] ?? ""),
        issuedOn: new Date().toISOString().slice(0, 10),
      });
      const { sendTransactionalEmail } = await import("../email.server");
      await sendTransactionalEmail({
        to: email,
        subject: `Your travel insurance policy - ${contractNo}`,
        text: `Hello ${String(sr["full_name"] ?? "")},

Your travel insurance policy has been issued. Your policy/contract number is ${contractNo}.

Your Amazingfly confirmation is attached. Sanlam Allianz will also email your official policy certificate.

Safe travels,
Amazingfly Travels`,
        idempotencyKey: `insurance-cert-${requestId}`,
        attachments: [
          { filename: pdf.filename, content: Buffer.from(pdf.bytes).toString("base64") },
        ],
      });
    }
  } catch (error) {
    console.error("[insurance] certificate email failed for", requestId, error);
  }
}

// --- Customer dashboard: list policies + download certificate ---------------

export type InsurancePolicyRow = {
  id: string;
  contractNumber: string;
  status: string;
  amountPaid: number;
  currency: string;
  createdAt: string;
  destination: string | null;
  coverBegins: string | null;
  coverEnds: string | null;
};

/** The signed-in customer's issued travel insurance policies. */
export const getMyInsurancePolicies = createServerFn({ method: "GET" }).handler(
  async (): Promise<InsurancePolicyRow[]> => {
    const { requireUser } = await import("../auth.server");
    const { user } = await requireUser();
    const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
    const supabase = createExternalSupabaseAdmin();

    const { data } = await supabase
      .from("travel_insurance_policies")
      .select(
        "id, contract_number, policy_status, amount_paid, currency, created_at, " +
          "travel_insurance_quotes(destination_country, cover_start_date, cover_end_date)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return ((data as Record<string, unknown>[] | null) ?? []).map((row) => {
      const quote = (row["travel_insurance_quotes"] as Record<string, unknown> | null) ?? null;
      return {
        id: String(row["id"]),
        contractNumber: String(row["contract_number"] ?? ""),
        status: String(row["policy_status"] ?? "issued"),
        amountPaid: Number(row["amount_paid"] ?? 0),
        currency: String(row["currency"] ?? "NGN"),
        createdAt: String(row["created_at"] ?? ""),
        destination: quote?.["destination_country"] ? String(quote["destination_country"]) : null,
        coverBegins: quote?.["cover_start_date"] ? String(quote["cover_start_date"]) : null,
        coverEnds: quote?.["cover_end_date"] ? String(quote["cover_end_date"]) : null,
      };
    });
  },
);

export type InsuranceCertificateResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; message: string };

/** Download the Amazingfly confirmation PDF for a policy the customer owns. */
export const getInsuranceCertificate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ policyId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<InsuranceCertificateResult> => {
    const { requireUser } = await import("../auth.server");
    const { user } = await requireUser();
    const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
    const supabase = createExternalSupabaseAdmin();

    const { data: policyRow } = await supabase
      .from("travel_insurance_policies")
      .select("id, user_id, contract_number, amount_paid, currency, service_request_id")
      .eq("id", data.policyId)
      .maybeSingle();
    const policy = (policyRow as Record<string, unknown> | null) ?? null;
    if (!policy || String(policy["user_id"]) !== user.id) {
      return { ok: false, message: "Policy not found." };
    }

    const { data: srRow } = await supabase
      .from("service_requests")
      .select("full_name, destination_country, travel_date, return_date, request_reference, created_at")
      .eq("id", policy["service_request_id"])
      .maybeSingle();
    const sr = (srRow as Record<string, unknown> | null) ?? {};

    const { createInsuranceCertificatePdf } = await import("./insurance-certificate-pdf");
    const currency = String(policy["currency"] ?? "NGN");
    const pdf = createInsuranceCertificatePdf({
      contractNumber: String(policy["contract_number"] ?? ""),
      travellerName: String(sr["full_name"] ?? ""),
      destination: String(sr["destination_country"] ?? ""),
      coverBegins: String(sr["travel_date"] ?? ""),
      coverEnds: String(sr["return_date"] ?? ""),
      amountPaid: `${currency} ${Number(policy["amount_paid"] ?? 0).toLocaleString()}`,
      reference: String(sr["request_reference"] ?? ""),
      issuedOn: String(policy["created_at"] ?? "").slice(0, 10),
    });
    return { ok: true, filename: pdf.filename, base64: Buffer.from(pdf.bytes).toString("base64") };
  });
