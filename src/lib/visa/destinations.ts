/**
 * Amazingfly visa destinations — the single source of truth for which
 * countries appear on the site (hero search, flag carousel, visa section) and
 * the requirements shown on each country page.
 *
 * Two routes:
 *  - "submission": applicant lodges documents at a visa application centre in
 *    Nigeria (VFS Global, TLScontact, CVASC) or the embassy (USA). These carry
 *    a full requirements checklist.
 *  - "evisa": Nigerian passport holders apply online; Amazingfly completes and
 *    submits the application on the official government portal.
 *
 * The requirements are a practical guide, NOT a guarantee — embassies and
 * immigration authorities set and change the final rules, and the decision is
 * always theirs.
 */

export type VisaRoute = "submission" | "evisa";
export type VisaCentre = "VFS Global" | "TLScontact" | "CVASC" | "US Embassy";
export type VisaRegion =
  | "Europe"
  | "North America"
  | "Africa"
  | "Asia"
  | "Middle East"
  | "Americas"
  | "Oceania";

export interface VisaDestination {
  slug: string;
  name: string;
  /** ISO alpha-2 code (drives the flag emoji). */
  alpha: string;
  flag: string;
  region: VisaRegion;
  route: VisaRoute;
  /** Where the application is lodged (submission route only). */
  centre?: VisaCentre;
  /** Extra one-line note about the centre / lodging. */
  centreNote?: string;
  visaTypes: string[];
  processingTime: string;
  /**
   * Pricing (NGN, per applicant). ESTIMATES pending confirmation.
   *  - visaFee: embassy/consular visa fee (submission) or the government
   *    e-Visa fee (evisa). Non-refundable.
   *  - processingFee: VFS Global / centre service fee (submission); 0 for
   *    e-Visa. Non-refundable.
   *  - serviceCharge: Amazingfly's charge. Refundable ONLY when the customer
   *    bought Visa Proof and the visa is refused.
   */
  visaFee: number;
  processingFee: number;
  serviceCharge: number;
  /**
   * When set, an all-inclusive fixed package price (per applicant). The fee
   * breakdown above is ignored for the total — used for the countries that
   * carry a maintained fixed-price package.
   */
  fixedPrice?: number;
  /** Hide the Visa Proof add-on for this destination (fixed-price packages). */
  noVisaProof?: boolean;
  /** Full document checklist (submission route). */
  documents?: string[];
  /** How the online application works (evisa route). */
  evisaNote?: string;
  /** Eligibility restriction, e.g. Morocco. */
  eligibilityNote?: string;
  /** Featured in the homepage flag carousel. */
  popular?: boolean;
}

/**
 * Optional add-on. If the customer buys Visa Proof and the visa is refused,
 * Amazingfly refunds the serviceCharge. The visa fee, processing/VFS fee and
 * this Visa Proof fee itself are never refundable.
 */
export const VISA_PROOF_FEE = 20000;

export type VisaPricing = {
  visaFee: number;
  processingFee: number;
  serviceCharge: number;
  /** Per-applicant total, excluding the optional Visa Proof add-on. */
  perApplicant: number;
  /** True for fixed-price package countries (show a single price, no breakdown). */
  fixed: boolean;
};

/** Per-applicant pricing breakdown for a destination. */
export function visaPricing(dest: VisaDestination): VisaPricing {
  if (dest.fixedPrice != null && dest.fixedPrice > 0) {
    return {
      visaFee: 0,
      processingFee: 0,
      serviceCharge: 0,
      perApplicant: dest.fixedPrice,
      fixed: true,
    };
  }
  const perApplicant = dest.visaFee + dest.processingFee + dest.serviceCharge;
  return {
    visaFee: dest.visaFee,
    processingFee: dest.processingFee,
    serviceCharge: dest.serviceCharge,
    perApplicant,
    fixed: false,
  };
}

/** Whether the Visa Proof add-on is offered for this destination. */
export function visaProofAllowed(dest: VisaDestination): boolean {
  return !dest.noVisaProof;
}

/**
 * Full total for a booking.
 * @param applicants number of applicants (min 1)
 * @param visaProof whether the Visa Proof add-on was selected
 */
export function visaBookingTotal(
  dest: VisaDestination,
  applicants = 1,
  visaProof = false,
): number {
  const count = Math.max(1, Math.floor(applicants || 1));
  const base = visaPricing(dest).perApplicant * count;
  const proof = visaProof && visaProofAllowed(dest) ? VISA_PROOF_FEE * count : 0;
  return base + proof;
}

/** Format a NGN amount, e.g. ₦160,000. */
export function formatNairaAmount(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Turn an ISO alpha-2 code (e.g. "NG") into its flag emoji (🇳🇬). */
export function alphaToFlagEmoji(alpha: string): string {
  const code = (alpha || "").trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return "🏳️";
  const base = 0x1f1e6;
  return String.fromCodePoint(base + (code.charCodeAt(0) - 65), base + (code.charCodeAt(1) - 65));
}

/** Nigeria is the fixed origin for every applicant. */
export const ORIGIN_COUNTRY = {
  name: "Nigeria",
  alpha: "NG",
  flag: alphaToFlagEmoji("NG"),
} as const;

// ---------------------------------------------------------------------------
// Shared checklists
// ---------------------------------------------------------------------------

const SCHENGEN_DOCS: string[] = [
  "Nigerian passport issued within the last 10 years, valid at least 3 months beyond your return date, with at least 2 blank pages",
  "Completed and signed Schengen visa application form",
  "Two recent biometric passport photographs (35mm x 45mm, white background)",
  "Travel medical insurance covering the entire Schengen area (minimum €30,000 cover)",
  "Confirmed return flight reservation / itinerary",
  "Proof of accommodation for the whole stay (hotel booking, or invitation letter with host's ID and residence proof)",
  "Cover letter stating the purpose and detailed itinerary of your trip",
  "Personal bank statements for the last 6 months (stamped by your bank)",
  "Proof of employment (introduction/leave letter), business registration (CAC), or school admission/ID",
  "Proof of sufficient funds (recent salary slips, tax or other financial evidence)",
  "Yellow fever vaccination certificate",
  "Visa fee payment receipt",
  "For business or family/friends visits: an invitation letter and the host's supporting documents",
];

const EVISA_DOCS: string[] = [
  "Valid Nigerian passport (usually at least 6 months validity remaining)",
  "Clear scan of your passport bio-data page",
  "Recent digital passport photograph",
  "Return / onward flight details",
  "Proof of accommodation (hotel booking or host address)",
  "A valid email address to receive the approved e-Visa",
  "Proof of funds and/or yellow fever certificate (where required by the destination)",
];

const SCHENGEN_TYPES = ["Tourist", "Business", "Family / Friends Visit"];
const SCHENGEN_TIME = "Approx. 15–30 working days (varies by consulate)";

function schengen(
  slug: string,
  name: string,
  alpha: string,
  opts: { centre?: VisaCentre; centreNote?: string; popular?: boolean } = {},
): VisaDestination {
  return {
    slug,
    name,
    alpha,
    flag: alphaToFlagEmoji(alpha),
    region: "Europe",
    route: "submission",
    centre: opts.centre ?? "VFS Global",
    ...(opts.centreNote ? { centreNote: opts.centreNote } : {}),
    visaTypes: SCHENGEN_TYPES,
    processingTime: SCHENGEN_TIME,
    // Schengen short-stay: €90 embassy fee + VFS service fee (NGN estimates).
    visaFee: 160000,
    processingFee: 25000,
    serviceCharge: 50000,
    documents: [...SCHENGEN_DOCS],
    ...(opts.popular ? { popular: true } : {}),
  };
}

function evisa(
  slug: string,
  name: string,
  alpha: string,
  region: VisaRegion,
  opts: {
    visaTypes?: string[];
    processingTime?: string;
    evisaNote?: string;
    eligibilityNote?: string;
    popular?: boolean;
    /** Government e-Visa fee (NGN estimate). */
    visaFee?: number;
    /** Amazingfly service charge (NGN). */
    serviceCharge?: number;
  } = {},
): VisaDestination {
  return {
    slug,
    name,
    alpha,
    flag: alphaToFlagEmoji(alpha),
    region,
    route: "evisa",
    visaTypes: opts.visaTypes ?? ["Tourist", "Business"],
    processingTime: opts.processingTime ?? "Typically 3–10 working days (varies)",
    // e-Visa: government fee only (no VFS) + service charge (NGN estimates).
    visaFee: opts.visaFee ?? 60000,
    processingFee: 0,
    serviceCharge: opts.serviceCharge ?? 30000,
    documents: [...EVISA_DOCS],
    evisaNote:
      opts.evisaNote ??
      `${name}'s visa for Nigerian passport holders is applied for entirely online — no embassy visit. Amazingfly completes and submits your application on the official government portal and sends your approved e-Visa by email.`,
    ...(opts.eligibilityNote ? { eligibilityNote: opts.eligibilityNote } : {}),
    ...(opts.popular ? { popular: true } : {}),
  };
}

// ---------------------------------------------------------------------------
// Bucket A — submit at a visa application centre in Nigeria
// ---------------------------------------------------------------------------

const SUBMISSION: VisaDestination[] = [
  {
    slug: "united-kingdom",
    name: "United Kingdom",
    alpha: "GB",
    flag: alphaToFlagEmoji("GB"),
    region: "Europe",
    route: "submission",
    centre: "VFS Global",
    visaTypes: ["Standard Visitor (Tourism)", "Business", "Family / Friends Visit"],
    processingTime: "Approx. 3 weeks (standard); priority services may be available",
    popular: true,
    visaFee: 280000,
    processingFee: 25000,
    serviceCharge: 50000,
    documents: [
      "Nigerian passport valid for the duration of your stay with at least one blank page (plus previous passports)",
      "Completed online UK visa application (VAF) and printed confirmation",
      "Recent digital passport photograph (as specified during booking)",
      "Tuberculosis (TB) test certificate from an IOM-approved clinic in Nigeria",
      "Bank statements for the last 6 months",
      "Proof of employment, business ownership (CAC), or studies",
      "Evidence of accommodation and your travel itinerary",
      "Cover letter explaining the purpose and length of your visit",
      "Proof of funds to cover the trip",
      "Sponsor's documents and invitation letter (if applicable)",
      "Previous travel history (old passports)",
      "Visa fee (and healthcare surcharge, if applicable) payment confirmation",
    ],
  },
  {
    slug: "ireland",
    name: "Ireland",
    alpha: "IE",
    flag: alphaToFlagEmoji("IE"),
    region: "Europe",
    route: "submission",
    centre: "VFS Global",
    visaTypes: ["Short Stay 'C' — Tourist", "Business", "Family / Friends Visit"],
    processingTime: "Approx. 4–8 weeks",
    visaFee: 105000,
    processingFee: 20000,
    serviceCharge: 50000,
    documents: [
      "Passport valid at least 6 months beyond your intended stay (plus previous passports)",
      "Completed AVATS online application summary sheet, signed",
      "Two recent passport photographs",
      "Signed application/cover letter stating the purpose and duration of your visit",
      "Bank statements for the last 6 months",
      "Proof of employment, business, or study",
      "Evidence of accommodation and a flight reservation",
      "Evidence of funds and of your obligations to return to Nigeria",
      "Invitation letter and sponsor's documents (if visiting)",
      "Visa fee payment",
    ],
  },
  schengen("germany", "Germany", "DE", { popular: true }),
  schengen("france", "France", "FR", {
    centre: "TLScontact",
    centreNote: "French visas in Nigeria are lodged at TLScontact (Lagos and Abuja).",
    popular: true,
  }),
  schengen("italy", "Italy", "IT", { popular: true }),
  schengen("netherlands", "Netherlands", "NL", { popular: true }),
  schengen("belgium", "Belgium", "BE"),
  schengen("austria", "Austria", "AT"),
  schengen("sweden", "Sweden", "SE"),
  schengen("norway", "Norway", "NO"),
  schengen("denmark", "Denmark", "DK"),
  schengen("finland", "Finland", "FI"),
  schengen("portugal", "Portugal", "PT"),
  schengen("switzerland", "Switzerland", "CH"),
  schengen("malta", "Malta", "MT"),
  {
    slug: "canada",
    name: "Canada",
    alpha: "CA",
    flag: alphaToFlagEmoji("CA"),
    region: "North America",
    route: "submission",
    centre: "VFS Global",
    centreNote: "Biometrics are captured at the VFS Global centre.",
    visaTypes: ["Visitor (Tourism)", "Business", "Family Visit"],
    processingTime: "Varies (often several weeks) — check current IRCC times",
    popular: true,
    visaFee: 215000,
    processingFee: 25000,
    serviceCharge: 50000,
    documents: [
      "Passport valid for your intended stay (plus previous passports)",
      "Completed IMM 5257 application and family information forms",
      "Recent passport photograph meeting Canadian specifications",
      "Proof of funds (6 months bank statements)",
      "Purpose of travel / cover letter and itinerary",
      "Proof of employment, business, or studies",
      "Evidence of ties to Nigeria (property, family, job)",
      "Invitation letter from your host in Canada (if applicable)",
      "Biometrics (fingerprints and photo) captured at VFS Global",
      "Travel history",
      "Visa (temporary resident) fee and biometrics fee payment",
      "Upfront medical examination (only if requested for your case)",
    ],
  },
  {
    slug: "united-states",
    name: "United States",
    alpha: "US",
    flag: alphaToFlagEmoji("US"),
    region: "North America",
    route: "submission",
    centre: "US Embassy",
    centreNote:
      "US visas are not processed by a third-party centre — you attend an in-person interview at the US Embassy (Abuja) or Consulate (Lagos).",
    visaTypes: ["B1/B2 (Business / Tourism)"],
    processingTime: "Interview-based; appointment wait times vary",
    popular: true,
    visaFee: 290000,
    processingFee: 0,
    serviceCharge: 50000,
    documents: [
      "Passport valid at least 6 months beyond your intended stay",
      "Completed DS-160 confirmation page",
      "One recent photograph (per DS-160 specification)",
      "Visa (MRV) fee payment receipt",
      "Interview appointment confirmation (US Embassy Abuja / Consulate Lagos)",
      "Evidence of funds (bank statements)",
      "Proof of employment, business, or studies",
      "Evidence of strong ties to Nigeria (family, job, property)",
      "Purpose of trip and itinerary, or invitation letter",
      "Previous travel history",
    ],
  },
  {
    slug: "australia",
    name: "Australia",
    alpha: "AU",
    flag: alphaToFlagEmoji("AU"),
    region: "Oceania",
    route: "submission",
    centre: "VFS Global",
    centreNote: "Biometrics are captured at the VFS Global centre.",
    visaTypes: ["Visitor (subclass 600)"],
    processingTime: "Varies by stream",
    popular: true,
    visaFee: 265000,
    processingFee: 25000,
    serviceCharge: 50000,
    documents: [
      "Passport valid for your intended stay",
      "Completed online application via ImmiAccount (Visitor visa subclass 600)",
      "Recent passport photograph",
      "Proof of sufficient funds (bank statements)",
      "Employment, business, or study evidence",
      "Purpose of visit and itinerary",
      "Evidence of ties and intention to return to Nigeria",
      "Invitation from host (if visiting family / friends)",
      "Overseas health insurance (recommended)",
      "Health examination and biometrics (if requested)",
      "Visa fee payment",
    ],
  },
  {
    slug: "india",
    name: "India",
    alpha: "IN",
    flag: alphaToFlagEmoji("IN"),
    region: "Asia",
    route: "submission",
    centre: "VFS Global",
    centreNote:
      "Many travellers qualify for the India e-Visa online; the sticker visa is submitted via VFS Global.",
    visaTypes: ["Tourist", "Business", "Medical"],
    processingTime: "Approx. 3–7 working days",
    popular: true,
    visaFee: 40000,
    processingFee: 20000,
    serviceCharge: 40000,
    documents: [
      "Passport valid at least 6 months with 2 blank pages",
      "Completed India visa application form (printed)",
      "Two passport photographs (51mm x 51mm, white background)",
      "Confirmed return flight itinerary",
      "Proof of accommodation or invitation",
      "Bank statements and proof of funds",
      "Cover letter stating the purpose of travel",
      "Yellow fever vaccination certificate",
      "Visa fee payment",
    ],
  },
  {
    slug: "south-africa",
    name: "South Africa",
    alpha: "ZA",
    flag: alphaToFlagEmoji("ZA"),
    region: "Africa",
    route: "submission",
    centre: "VFS Global",
    visaTypes: ["Visitor's — Tourism", "Business", "Family Visit"],
    processingTime: "Approx. 5–10 working days",
    popular: true,
    visaFee: 35000,
    processingFee: 25000,
    serviceCharge: 40000,
    documents: [
      "Passport valid at least 30 days beyond departure with 2 blank pages",
      "Completed BI-84 application form",
      "Two passport photographs",
      "Bank statements for the last 3 months",
      "Proof of employment, business, or study",
      "Return flight itinerary and proof of accommodation",
      "Yellow fever vaccination certificate",
      "Cover letter and itinerary",
      "Invitation letter (if visiting)",
      "Visa fee payment",
    ],
  },
  {
    slug: "china",
    name: "China",
    alpha: "CN",
    flag: alphaToFlagEmoji("CN"),
    region: "Asia",
    route: "submission",
    centre: "CVASC",
    centreNote: "Chinese visas in Nigeria are lodged at the Chinese Visa Application Service Centre (CVASC).",
    visaTypes: ["Tourist (L)", "Business (M)", "Family Visit"],
    processingTime: "Approx. 4–7 working days",
    popular: true,
    visaFee: 90000,
    processingFee: 20000,
    serviceCharge: 50000,
    documents: [
      "Passport valid at least 6 months with 2 blank pages (plus a copy)",
      "Completed China visa application form (V.2013) with a recent photo",
      "Round-trip flight booking and hotel reservation for the whole stay",
      "Detailed day-by-day itinerary",
      "Invitation letter (for business/visit) from the Chinese host or company",
      "Bank statements / proof of funds",
      "Proof of employment",
      "Visa fee payment",
    ],
  },
];

// ---------------------------------------------------------------------------
// Bucket B — e-Visa online for Nigerian passport holders
// ---------------------------------------------------------------------------

const EVISA: VisaDestination[] = [
  // Africa
  evisa("kenya", "Kenya", "KE", "Africa", {
    visaTypes: ["Electronic Travel Authorisation (eTA)"],
    processingTime: "Typically 3 working days",
    visaFee: 50000,
    popular: true,
  }),
  evisa("ethiopia", "Ethiopia", "ET", "Africa", { visaFee: 130000, popular: true }),
  evisa("rwanda", "Rwanda", "RW", "Africa", { visaFee: 80000, popular: true }),
  evisa("uganda", "Uganda", "UG", "Africa", { visaFee: 80000 }),
  evisa("tanzania", "Tanzania", "TZ", "Africa", { visaFee: 80000 }),
  evisa("zambia", "Zambia", "ZM", "Africa", { visaFee: 60000 }),
  evisa("zimbabwe", "Zimbabwe", "ZW", "Africa", { visaFee: 55000 }),
  evisa("angola", "Angola", "AO", "Africa", { visaFee: 190000 }),
  evisa("botswana", "Botswana", "BW", "Africa", { visaFee: 60000 }),
  evisa("namibia", "Namibia", "NA", "Africa", { visaFee: 70000 }),
  evisa("djibouti", "Djibouti", "DJ", "Africa", { visaFee: 40000 }),
  evisa("gabon", "Gabon", "GA", "Africa", { visaFee: 120000 }),
  evisa("madagascar", "Madagascar", "MG", "Africa", { visaFee: 55000 }),
  evisa("malawi", "Malawi", "MW", "Africa", { visaFee: 100000 }),
  evisa("egypt", "Egypt", "EG", "Africa", { visaFee: 45000, popular: true }),
  evisa("morocco", "Morocco", "MA", "Africa", {
    visaFee: 40000,
    eligibilityNote:
      "Morocco's e-Visa is available to Nigerian passport holders who hold — or have previously held — a valid visa or entry stamp for a Schengen country, the United States, or Canada (and certain other developed countries). If you have never travelled to these regions, you may not be eligible for the e-Visa.",
  }),
  evisa("cote-divoire", "Côte d'Ivoire", "CI", "Africa", { visaFee: 115000 }),
  evisa("benin", "Benin", "BJ", "Africa", { visaFee: 80000 }),
  evisa("cameroon", "Cameroon", "CM", "Africa", { visaFee: 110000 }),
  evisa("guinea", "Guinea", "GN", "Africa", { visaFee: 90000 }),
  evisa("lesotho", "Lesotho", "LS", "Africa", { visaFee: 40000 }),
  evisa("sao-tome-and-principe", "São Tomé & Príncipe", "ST", "Africa", { visaFee: 50000 }),
  evisa("burundi", "Burundi", "BI", "Africa", { visaFee: 140000 }),
  // Middle East
  evisa("qatar", "Qatar", "QA", "Middle East", { visaFee: 30000, popular: true }),
  evisa("united-arab-emirates", "United Arab Emirates", "AE", "Middle East", {
    visaFee: 150000,
    popular: true,
  }),
  evisa("oman", "Oman", "OM", "Middle East", { visaFee: 40000 }),
  // Asia
  evisa("sri-lanka", "Sri Lanka", "LK", "Asia", { visaFee: 80000 }),
  evisa("malaysia", "Malaysia", "MY", "Asia", { visaFee: 45000, popular: true }),
  evisa("cambodia", "Cambodia", "KH", "Asia", { visaFee: 55000 }),
  evisa("pakistan", "Pakistan", "PK", "Asia", { visaFee: 40000 }),
  evisa("azerbaijan", "Azerbaijan", "AZ", "Asia", { visaFee: 40000 }),
  evisa("uzbekistan", "Uzbekistan", "UZ", "Asia", { visaFee: 35000 }),
  evisa("tajikistan", "Tajikistan", "TJ", "Asia", { visaFee: 80000 }),
  // Americas
  evisa("antigua-and-barbuda", "Antigua & Barbuda", "AG", "Americas", { visaFee: 150000 }),
  evisa("ecuador", "Ecuador", "EC", "Americas", { visaFee: 80000 }),
  evisa("el-salvador", "El Salvador", "SV", "Americas", { visaFee: 60000 }),
  evisa("bolivia", "Bolivia", "BO", "Americas", { visaFee: 80000 }),
  evisa("guyana", "Guyana", "GY", "Americas", { visaFee: 60000 }),
  evisa("nicaragua", "Nicaragua", "NI", "Americas", { visaFee: 80000 }),
  evisa("suriname", "Suriname", "SR", "Americas", { visaFee: 60000 }),
  evisa("trinidad-and-tobago", "Trinidad & Tobago", "TT", "Americas", { visaFee: 70000 }),
  // Europe
  evisa("albania", "Albania", "AL", "Europe", { visaFee: 60000 }),
  evisa("georgia", "Georgia", "GE", "Europe", { visaFee: 40000 }),
  evisa("moldova", "Moldova", "MD", "Europe", { visaFee: 60000 }),
  evisa("serbia", "Serbia", "RS", "Europe", { visaFee: 60000 }),
];

// ---------------------------------------------------------------------------
// Pricing rules (applied on top of the base estimates above)
// ---------------------------------------------------------------------------

/**
 * FX markup added to EVERY (non fixed-price) visa fee to absorb the recent
 * dollar rise: the stated USD visa cost is unchanged, but the Naira
 * conversion carries ≈ $3 extra. ₦5,000 ≈ $3 at ~₦1,650/$.
 */
const VISA_FEE_FX_MARKUP = 5000;
/** Added to the VFS / centre fee to cover courier (submission countries). */
const COURIER_FEE = 20000;
/** Service charge for European visa-application (submission) countries. */
const EUROPE_SERVICE_CHARGE = 150000;
/** Service charge for African countries without a fixed-price package. */
const AFRICA_SERVICE_CHARGE = 100000;

/**
 * Countries that keep their maintained fixed-price package (all-inclusive,
 * per applicant) and do NOT offer the Visa Proof add-on.
 */
const FIXED_PACKAGE_PRICES: Record<string, number> = {
  qatar: 700000,
  "united-arab-emirates": 300000,
  ethiopia: 250000,
  "south-africa": 1100000,
  oman: 2500000,
  morocco: 300000,
  uganda: 180000,
  kenya: 150000,
};

function applyPricingRules(d: VisaDestination): VisaDestination {
  const fixed = FIXED_PACKAGE_PRICES[d.slug];
  if (fixed != null) {
    // Maintain the package price; no increases, no Visa Proof.
    return { ...d, fixedPrice: fixed, noVisaProof: true };
  }
  const visaFee = d.visaFee + VISA_FEE_FX_MARKUP;
  const processingFee = d.route === "submission" ? d.processingFee + COURIER_FEE : d.processingFee;
  // Countries on the standard ₦150,000 service charge: all of Europe
  // (submission + e-Visa), the USA, Canada, Australia and India.
  const STANDARD_150K = new Set(["united-states", "canada", "australia", "india"]);
  let serviceCharge = d.serviceCharge;
  if (d.slug === "china") {
    serviceCharge = 600000;
  } else if (d.region === "Europe" || STANDARD_150K.has(d.slug)) {
    serviceCharge = EUROPE_SERVICE_CHARGE;
  } else if (d.region === "Africa") {
    serviceCharge = AFRICA_SERVICE_CHARGE;
  }
  return { ...d, visaFee, processingFee, serviceCharge };
}

export const VISA_DESTINATIONS: readonly VisaDestination[] = [...SUBMISSION, ...EVISA].map(
  applyPricingRules,
);

// ---------------------------------------------------------------------------
// Lookups & helpers
// ---------------------------------------------------------------------------

export function getVisaDestination(slug: string | undefined | null): VisaDestination | undefined {
  if (!slug) return undefined;
  return VISA_DESTINATIONS.find((d) => d.slug === slug);
}

/** Match a free-text country name (e.g. from a search param) to a destination. */
export function findVisaDestinationByName(name: string | undefined | null): VisaDestination | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return VISA_DESTINATIONS.find((d) => d.name.toLowerCase() === key || d.slug === key);
}

/** Destinations sorted A→Z. */
export const VISA_DESTINATIONS_SORTED: readonly VisaDestination[] = [...VISA_DESTINATIONS].sort(
  (a, b) => a.name.localeCompare(b.name),
);

const REGION_ORDER: VisaRegion[] = [
  "Europe",
  "North America",
  "Africa",
  "Asia",
  "Middle East",
  "Americas",
  "Oceania",
];

/** Destinations grouped by region (each group A→Z), for the browse page. */
export function visaDestinationsByRegion(
  route?: VisaRoute,
): Array<{ region: VisaRegion; items: VisaDestination[] }> {
  const source = route ? VISA_DESTINATIONS.filter((d) => d.route === route) : VISA_DESTINATIONS;
  return REGION_ORDER.map((region) => ({
    region,
    items: source
      .filter((d) => d.region === region)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length > 0);
}
