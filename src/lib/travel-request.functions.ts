import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const documentSchema = z.object({
  document_type: z.string().trim().min(1).max(60),
  file_url: z.string().trim().min(1).max(500),
  file_name: z.string().trim().min(1).max(260),
  file_size: z.number().int().nonnegative().max(20 * 1024 * 1024),
});

const dateish = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const answerSchema = z.object({
  id: z.string().trim().min(1).max(80),
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().max(4000),
});

/** Customer-supplied fields only. Workflow columns (request_status,
 * payment_status, agreed_fee, staff_notes) are never accepted from the site.
 *
 * `amount`, `currency` and `requires_quote` are retained for backwards
 * compatibility with existing clients, but are NEVER trusted for pricing.
 * The server derives the actual payable amount below.
 */
const submissionSchema = z
  .object({
    request_reference: z.string().regex(/^AF-\d{8}-[A-Z0-9]{6}$/),
    service_type: z.string().trim().min(1).max(160),
    service_slug: z.string().trim().min(1).max(80),
    service_category: z.string().trim().min(1).max(60),
    origin_country: z.string().trim().max(120),
    destination_country: z.string().trim().max(120),
    travel_purpose: z.string().trim().max(120).nullable(),
    travel_date: dateish,
    return_date: dateish,
    traveller_count: z.number().int().min(1).max(30),
    request_details: z.string().trim().max(4000),
    answers: z.array(answerSchema).max(60),
    full_name: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(1).max(40),
    whatsapp: z.string().trim().max(40).nullable(),
    country_of_residence: z.string().trim().max(120).nullable(),
    nationality: z.string().trim().max(120).nullable(),
    preferred_contact: z.enum(["whatsapp", "phone", "email"]),
    passport_number: z.string().trim().max(40).nullable(),
    passport_country: z.string().trim().max(120).nullable(),
    date_of_birth: dateish,
    passport_issue_date: dateish,
    passport_expiry_date: dateish,
    catalogue_id: z.string().trim().max(90).nullable().optional(),
    package_name: z.string().trim().max(200).nullable().optional(),
    amount: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
    currency: z.string().trim().max(8).optional(),
    requires_quote: z.boolean().optional(),
    documents: z.array(documentSchema).max(20),
    consent_to_contact: z.literal(true),
  })
  .strict();

export type TravelRequestSubmission = z.infer<typeof submissionSchema>;

export type SubmitResult =
  | { ok: true; reference: string; requestId: string; payable: boolean }
  | { ok: false; code?: string; message: string };

const uploadInput = z.object({
  request_reference: z.string().regex(/^AF-\d{8}-[A-Z0-9]{6}$/),
  document_type: z.string().trim().min(1).max(60),
  file_name: z.string().trim().min(1).max(260),
  file_size: z.number().int().positive().max(10 * 1024 * 1024),
});

const BUCKET = "request-documents";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

function answerValue(
  answers: Array<{ id: string; question: string; answer: string }>,
  id: string,
): string {
  return answers.find((entry) => entry.id === id)?.answer.trim() ?? "";
}

const DOCUMENT_CATALOGUE_IDS: Record<string, string> = {
  "Police character certificate": "police-character-certificate",
  "Proof of funds": "proof-of-funds-support",
  "Yellow fever card": "yellow-fever-card-support",
  "Travel insurance": "travel-insurance-cover",
};

type OfficialPackage = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  active: boolean;
};

async function loadOfficialPackage(
  supabase: Awaited<ReturnType<typeof import("./external-supabase.server")["createExternalSupabaseAdmin"]>>,
  catalogueId: string,
): Promise<OfficialPackage | null> {
  const { data, error } = await supabase
    .from("service_catalogue")
    .select("id, name, category, price, currency, active")
    .eq("id", catalogueId)
    .maybeSingle();

  if (!error && data && data["active"] !== false) {
    return {
      id: String(data["id"]),
      name: String(data["name"] ?? "Travel service"),
      category: String(data["category"] ?? ""),
      price: Number(data["price"] ?? 0),
      currency: String(data["currency"] ?? "NGN"),
      active: true,
    };
  }

  // Bundled catalogue fallback keeps checkout working if the catalogue table
  // is temporarily unavailable. It is still server-side and cannot be altered
  // by the browser.
  const { findCatalogueItem } = await import("./catalogue/visa-catalogue");
  const fallback = findCatalogueItem(catalogueId);
  if (!fallback?.active) return null;
  return {
    id: fallback.id,
    name: fallback.name,
    category: fallback.category,
    price: Number(fallback.price ?? 0),
    currency: fallback.currency ?? "NGN",
    active: true,
  };
}

/** Returns a short-lived signed upload URL so the browser can upload directly
 * into the private documents bucket without any credentials. */
export const createDocumentUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => uploadInput.parse(data))
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; path: string; uploadUrl: string } | { ok: false; message: string }
    > => {
      const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
      const supabase = createExternalSupabaseAdmin();
      const path = `${data.request_reference}/${data.document_type}/${Date.now()}-${safeName(
        data.file_name,
      )}`;
      const { data: signed, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);
      if (error || !signed) {
        return { ok: false, message: error?.message ?? "Could not prepare the upload." };
      }
      const base = process.env["EXTERNAL_SUPABASE_URL"]!;
      const uploadUrl = signed.signedUrl.startsWith("http")
        ? signed.signedUrl
        : `${base}/storage/v1${signed.signedUrl}`;
      return { ok: true, path, uploadUrl };
    },
  );

export const submitTravelRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submissionSchema.parse(data))
  .handler(async ({ data }): Promise<SubmitResult> => {
    const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
    const {
      calculateProofOfFundsFee,
      YELLOW_FEVER_CARD_PRICE_NGN,
    } = await import("./catalogue/service-pricing");
    const supabase = createExternalSupabaseAdmin();

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("slug", data.service_slug)
      .maybeSingle();
    if (serviceError || !service) {
      return { ok: false, message: "That service is not available right now." };
    }

    const documentService = answerValue(data.answers, "document_service");
    const inferredCatalogueId = DOCUMENT_CATALOGUE_IDS[documentService] ?? null;
    const catalogueId = data.catalogue_id ?? inferredCatalogueId;
    const packageItem = catalogueId ? await loadOfficialPackage(supabase, catalogueId) : null;

    const normalizedCategory = data.service_category.trim().toLowerCase();
    const isFlightOrHotel = /flight|hotel/.test(
      `${normalizedCategory} ${data.service_type}`.toLowerCase(),
    );

    let serviceAmount: number | null = null;
    let serviceCurrency = "NGN";
    let serviceType = packageItem?.name ?? data.service_type;
    let packageName = packageItem?.name ?? data.package_name ?? null;
    let storedAnswers = [...data.answers];

    // Proof of Funds is calculated solely from server-owned bank rates.
    if (catalogueId === "proof-of-funds-support" || documentService === "Proof of funds") {
      const bank = answerValue(data.answers, "pof_bank");
      const requestedAmount = Number(answerValue(data.answers, "pof_amount"));
      const calculation = calculateProofOfFundsFee(requestedAmount, bank);
      if (!calculation) {
        return {
          ok: false,
          message: "Please choose a supported Proof of Funds bank and enter a valid amount.",
        };
      }

      serviceType = "Proof of Funds Support";
      packageName = "Proof of Funds Support";
      serviceAmount = calculation.fee;
      serviceCurrency = "NGN";
      storedAnswers = [
        ...storedAnswers.filter((entry) => !["pof_rate", "pof_fee"].includes(entry.id)),
        {
          id: "pof_rate",
          question: "Proof of Funds bank rate",
          answer: `${calculation.rate}%`,
        },
        {
          id: "pof_fee",
          question: "Calculated Proof of Funds service fee",
          answer: `NGN ${calculation.fee.toFixed(2)}`,
        },
      ];
    } else if (
      catalogueId === "yellow-fever-card-support" ||
      documentService === "Yellow fever card"
    ) {
      // Fixed business rule supplied by Amazingfly: ₦25,000.
      serviceType = "Yellow Fever Card Assistance";
      packageName = "Yellow Fever Card Assistance";
      serviceAmount = YELLOW_FEVER_CARD_PRICE_NGN;
      serviceCurrency = "NGN";
    } else if (
      catalogueId === "travel-insurance-cover" ||
      normalizedCategory === "insurance" ||
      documentService === "Travel insurance"
    ) {
      // Allianz will be the price authority once the insurance API is supplied.
      // Do not accept a browser-entered/manual insurance amount in the meantime.
      return {
        ok: false,
        message:
          "Travel insurance online pricing is being connected to Allianz. Please try again once live pricing is available.",
      };
    } else if (!isFlightOrHotel && packageItem) {
      if (!Number.isFinite(packageItem.price) || packageItem.price <= 0) {
        return {
          ok: false,
          message: "This service does not yet have an online payment price configured.",
        };
      }
      serviceAmount = packageItem.price;
      serviceCurrency = packageItem.currency || "NGN";
    }

    // The generic flight/hotel request wizard remains request-only; live
    // supplier search/booking flows own their own fare/rate pricing.
    if (!isFlightOrHotel && (!serviceAmount || serviceAmount <= 0)) {
      return {
        ok: false,
        message: "This service does not yet have an online payment price configured.",
      };
    }

    // Customer record (one per email, refreshed with the latest details).
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          full_name: data.full_name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          whatsapp: data.whatsapp,
          nationality: data.nationality,
          country_of_residence: data.country_of_residence,
        },
        { onConflict: "email" },
      )
      .select("id")
      .maybeSingle();
    if (customerError) {
      return {
        ok: false,
        ...(customerError.code ? { code: customerError.code } : {}),
        message: customerError.message,
      };
    }

    // Every answer is also folded into request_details so nothing is lost even
    // if the dynamic columns have not been added to the database yet.
    const answerText = storedAnswers
      .filter((a) => a.answer)
      .map((a) => `${a.question}: ${a.answer}`)
      .join("\n");
    const details = [
      data.request_details || "Submitted through the dynamic request form.",
      answerText,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 8000);

    const baseRow = {
      request_reference: data.request_reference,
      service_id: service.id,
      customer_id: customer?.id ?? null,
      service_type: serviceType,
      origin_country: data.origin_country || null,
      destination_country: data.destination_country || null,
      destination: data.destination_country || serviceType,
      travel_purpose: data.travel_purpose,
      travel_date: data.travel_date,
      return_date: data.return_date,
      traveller_count: data.traveller_count,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp,
      passport_number: data.passport_number,
      passport_country: data.passport_country,
      date_of_birth: data.date_of_birth,
      passport_issue_date: data.passport_issue_date,
      passport_expiry_date: data.passport_expiry_date,
      request_details: details,
      preferred_contact: data.preferred_contact,
      consent_to_contact: true,
    };

    // Amazingfly's customer-service rule is Review -> Payment. There is no
    // quotation-only path for a service whose price can be calculated here.
    const requiresQuote = false;

    const dynamicRow = {
      ...baseRow,
      service_category: data.service_category,
      answers: storedAnswers,
      catalogue_id: catalogueId,
      package_name: packageName,
      amount: serviceAmount,
      currency: serviceCurrency,
      requires_quote: requiresQuote,
      payment_status: "pending_payment",
    };

    let { data: request, error: requestError } = await supabase
      .from("service_requests")
      .insert(dynamicRow)
      .select("id")
      .maybeSingle();

    // 42703 = column does not exist (dynamic columns not migrated yet).
    // First drop only the newest column (package_name), then fall back fully.
    if (requestError?.code === "42703" || requestError?.code === "PGRST204") {
      const { package_name: _omit, ...withoutPackageName } = dynamicRow;
      ({ data: request, error: requestError } = await supabase
        .from("service_requests")
        .insert(withoutPackageName)
        .select("id")
        .maybeSingle());
    }

    if (requestError?.code === "42703" || requestError?.code === "PGRST204") {
      ({ data: request, error: requestError } = await supabase
        .from("service_requests")
        .insert(baseRow)
        .select("id")
        .maybeSingle());
    }

    if (requestError || !request) {
      return {
        ok: false,
        ...(requestError?.code ? { code: requestError.code } : {}),
        message: requestError?.message ?? "Could not save the request.",
      };
    }

    let payable = Boolean(!isFlightOrHotel && serviceAmount && serviceAmount > 0);
    if (payable && serviceAmount) {
      const { createPendingTransaction } = await import("./payment/transactions.server");
      const { paymentTypeForService } = await import("./payment/types");
      const created = await createPendingTransaction({
        user_id: null,
        request_id: request.id,
        amount: serviceAmount,
        currency: serviceCurrency,
        provider: "paystack",
        payment_type: paymentTypeForService(serviceType),
      });

      // Keep payable=true even if the first transaction insert temporarily
      // fails. The authenticated request page calls prepareCheckout(), which
      // can safely create the missing pending transaction from the server-owned
      // amount stored on service_requests.
      if (!created.ok) {
        console.error("[service-payment] pending transaction", created.message);
      }
    }

    if (data.documents.length) {
      const { error: docError } = await supabase.from("uploaded_documents").insert(
        data.documents.map((doc) => ({
          request_id: request.id,
          document_type: doc.document_type,
          file_url: doc.file_url,
          file_name: doc.file_name,
          file_size: doc.file_size,
        })),
      );
      if (docError) console.error("[uploaded_documents]", docError.message);
    }

    const { notifyRequestReceived } = await import("./notifications.server");
    await notifyRequestReceived({
      reference: data.request_reference,
      fullName: data.full_name,
      email: data.email,
      serviceLabel: serviceType,
      originCountry: data.origin_country,
      destinationCountry: data.destination_country,
      travelDate: data.travel_date,
      documentCount: data.documents.length,
    });

    return { ok: true, reference: data.request_reference, requestId: request.id, payable };
  });

const trackInput = z.object({
  reference: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(200),
});

export type TrackResult =
  | {
      found: true;
      reference: string;
      status: string;
      service_type: string | null;
      destination: string | null;
      created_at: string;
    }
  | { found: false };

/** Reference + email lookup. Returns status only - never personal data. */
export const trackTravelRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackInput.parse(data))
  .handler(async ({ data }): Promise<TrackResult> => {
    const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
    const supabase = createExternalSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("service_requests")
      .select("request_reference, request_status, service_type, destination_country, destination, created_at, email")
      .eq("request_reference", data.reference.trim().toUpperCase())
      .maybeSingle();

    if (error || !row) return { found: false };
    if (String(row["email"]).toLowerCase() !== data.email.toLowerCase()) return { found: false };

    return {
      found: true,
      reference: row["request_reference"],
      status: row["request_status"] ?? "new_request",
      service_type: row["service_type"] ?? null,
      destination: row["destination_country"] ?? row["destination"] ?? null,
      created_at: row["created_at"],
    };
  });
