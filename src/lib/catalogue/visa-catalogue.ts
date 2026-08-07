/**
 * Amazingfly Travels service catalogue (client-safe).
 *
 * Every payable, fixed-price service the platform offers lives here: visa
 * services per destination, Schengen tourist visas per country and the
 * Police Character Certificate. Prices are in NGN.
 *
 * `requiresQuote: true` means the customer cannot pay immediately — an admin
 * must price the request first (long-stay visas, bespoke work).
 */

export type CatalogueCategory =
  | "visa"
  | "flights"
  | "hotels"
  | "proof-of-funds"
  | "police-character-certificate"
  | "yellow-fever-card"
  | "travel-insurance";

export type CatalogueItem = {
  id: string;
  category: CatalogueCategory;
  /** Country or region the service applies to. */
  country: string;
  flag?: string;
  /** Customer-facing name. */
  name: string;
  /** Customer-friendly explanation of what the package covers. */
  description?: string;
  /** Visa/service type wording. */
  serviceType: string;
  price: number;
  currency: "NGN";
  /** True when the price is a starting point ("from ₦700,000"). */
  priceFrom?: boolean;
  processingTime: string;
  validity?: string;
  requirements: string[];
  /** Optional supporting documents (never mandatory). */
  optionalDocuments?: string[];
  includes?: string[];
  notes?: string[];
  requiresQuote?: boolean;
  active: boolean;
};


/** Shown wherever a flight or hotel itinerary is listed as supporting evidence. */
export const ITINERARY_NOTE =
  "Flight and hotel itineraries can be provided by the customer or Amazingfly Travels can assist with preparing the required travel documentation.";

/** Applies to every service page and every request confirmation. */
export const PROCESSING_FAQ = [
  {
    question: "Are the processing times guaranteed?",
    answer:
      "No. Processing times are estimated and may extend beyond the suggested period due to embassy appointment availability, embassy delays, additional document requests, public holidays and government processing delays. Amazingfly Travels cannot control embassy processing timelines.",
  },
  {
    question: "Do you guarantee visa approval?",
    answer:
      "No. Amazingfly Travels provides application assistance and documentation support. The final decision always rests with the embassy, consulate or immigration authority.",
  },
  {
    question: "Are flight and hotel itineraries compulsory?",
    answer: ITINERARY_NOTE,
  },
  {
    question: "When can I pay?",
    answer:
      "Once your application form is complete and your documents are uploaded, payment becomes available immediately. Services that need a personalised quotation are priced by our visa specialist first.",
  },
];

const PASSPORT_BASICS = ["Passport datapage", "Passport photo"];

/** Visa categories Amazingfly Travels offers. Nothing else is supported. */
export const VISA_TYPES = ["Tourist", "Visit", "Business"] as const;

export const SCHENGEN_COUNTRIES = [
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Netherlands",
  "Belgium",
  "Austria",
  "Switzerland",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Greece",
  "Portugal",
  "Poland",
  "Czech Republic",
  "Hungary",
  "Croatia",
  "Slovenia",
  "Slovakia",
  "Estonia",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Iceland",
  "Liechtenstein",
] as const;

export const SCHENGEN_SINGLE_ENTRY_PRICE = 500_000;
export const SCHENGEN_MULTIPLE_ENTRY_PRICE = 600_000;

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const SCHENGEN_ITEMS: CatalogueItem[] = SCHENGEN_COUNTRIES.flatMap((country) => {
  const base = {
    category: "visa" as const,
    country,
    currency: "NGN" as const,
    processingTime: "1 – 2 months",
    validity: "As granted by the embassy",
    requirements: [
      ...PASSPORT_BASICS,
      "Bank statement",
      "Employment or business evidence",
      "Travel insurance",
    ],
    optionalDocuments: ["Flight itinerary (optional)", "Hotel itinerary (optional)"],
    notes: [ITINERARY_NOTE],
    active: true,
  };
  return [
    {
      ...base,
      id: `schengen-${slug(country)}-single`,
      name: `${country} Schengen Visa — Single Entry`,
      serviceType: "Tourist / Visit / Business",
      price: SCHENGEN_SINGLE_ENTRY_PRICE,
    },
    {
      ...base,
      id: `schengen-${slug(country)}-multiple`,
      name: `${country} Schengen Visa — Multiple Entry`,
      serviceType: "Tourist / Visit / Business",
      price: SCHENGEN_MULTIPLE_ENTRY_PRICE,
    },
  ];
});

export const CATALOGUE: CatalogueItem[] = [
  {
    id: "qatar-tourist-package",
    category: "visa",
    country: "Qatar",
    flag: "🇶🇦",
    name: "Qatar Tourist Package",
    serviceType: "Tourist",
    price: 700_000,
    priceFrom: true,
    currency: "NGN",
    processingTime: "24 hours – 7 days",
    validity: "As granted",
    requirements: [...PASSPORT_BASICS],
    includes: ["Qatar visa", "Airport transfer", "Daily buffet breakfast"],
    active: true,
  },
  {
    id: "qatar-residence-2-years",
    category: "visa",
    country: "Qatar",
    flag: "🇶🇦",
    name: "Qatar 2 Years Residence Visa",
    serviceType: "Visit",
    price: 3_300_000,
    currency: "NGN",
    processingTime: "24 hours – 7 days",
    validity: "2 years",
    requirements: [...PASSPORT_BASICS],
    active: true,
  },
  {
    id: "mexico-sticker-visa",
    category: "visa",
    country: "Mexico",
    flag: "🇲🇽",
    name: "Mexico Sticker Visa",
    serviceType: "Tourist",
    price: 2_800_000,
    currency: "NGN",
    processingTime: "4 hours after biometrics",
    validity: "6 months multiple entry",
    requirements: [...PASSPORT_BASICS, "3 months bank statement"],
    active: true,
  },
  {
    id: "uae-dubai-5-year-multiple",
    category: "visa",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    name: "Dubai UAE 5 Years Multiple Entry Tourist Visa",
    serviceType: "Tourist",
    price: 3_800_000,
    currency: "NGN",
    processingTime: "7 – 14 days",
    validity: "5 years",
    requirements: [...PASSPORT_BASICS, "6 months bank statement"],
    active: true,
  },
  {
    id: "seychelles-visa",
    category: "visa",
    country: "Seychelles",
    flag: "🇸🇨",
    name: "Seychelles Visa",
    serviceType: "Tourist",
    price: 200_000,
    currency: "NGN",
    processingTime: "24 hours – 5 days",
    validity: "30 days",
    requirements: [...PASSPORT_BASICS, "Yellow fever card"],
    active: true,
  },
  {
    id: "ethiopia-visa",
    category: "visa",
    country: "Ethiopia",
    flag: "🇪🇹",
    name: "Ethiopia Visa",
    serviceType: "Tourist",
    price: 250_000,
    currency: "NGN",
    processingTime: "24 hours – 5 days",
    validity: "30 days",
    requirements: [...PASSPORT_BASICS, "Yellow fever card"],
    active: true,
  },
  {
    id: "south-africa-visa",
    category: "visa",
    country: "South Africa",
    flag: "🇿🇦",
    name: "South Africa Visa",
    serviceType: "Tourist",
    price: 1_100_000,
    currency: "NGN",
    processingTime: "7 – 14 days",
    validity: "90 days stay",
    requirements: [...PASSPORT_BASICS, "Yellow fever card"],
    active: true,
  },
  {
    id: "oman-residence-visa",
    category: "visa",
    country: "Oman",
    flag: "🇴🇲",
    name: "Oman Residence Visa",
    serviceType: "Visit",
    price: 2_500_000,
    currency: "NGN",
    processingTime: "24 hours – 7 days",
    validity: "2 years",
    requirements: [...PASSPORT_BASICS],
    active: true,
  },
  {
    id: "indonesia-visa",
    category: "visa",
    country: "Indonesia",
    flag: "🇮🇩",
    name: "Indonesia Visa",
    serviceType: "Tourist",
    price: 900_000,
    currency: "NGN",
    processingTime: "10 – 14 days",
    validity: "60 days",
    requirements: [...PASSPORT_BASICS],
    optionalDocuments: ["Flight itinerary (optional)", "Hotel itinerary (optional)"],
    notes: [ITINERARY_NOTE],
    active: true,
  },
  {
    id: "morocco-visa",
    category: "visa",
    country: "Morocco",
    flag: "🇲🇦",
    name: "Morocco Visa",
    serviceType: "Tourist",
    price: 300_000,
    currency: "NGN",
    processingTime: "5 – 7 days",
    validity: "30 days stay",
    requirements: [...PASSPORT_BASICS, "UK / US / Canada / Schengen visa copy if available"],
    optionalDocuments: ["Flight itinerary (optional)", "Hotel itinerary (optional)"],
    notes: [ITINERARY_NOTE],
    active: true,
  },
  {
    id: "uae-non-nigerian",
    category: "visa",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    name: "UAE Visa — Non-Nigerian Applicants",
    serviceType: "Tourist",
    price: 300_000,
    currency: "NGN",
    processingTime: "5 – 7 days",
    validity: "30 days",
    requirements: [...PASSPORT_BASICS],
    optionalDocuments: ["Flight itinerary (optional)", "Hotel itinerary (optional)"],
    notes: [ITINERARY_NOTE],
    active: true,
  },
  {
    id: "east-africa-visa",
    category: "visa",
    country: "East Africa (Uganda, Kenya, Rwanda)",
    flag: "🇺🇬🇰🇪🇷🇼",
    name: "East Africa Visa",
    serviceType: "Tourist",
    price: 330_000,
    currency: "NGN",
    processingTime: "24 hours – 7 days",
    validity: "90 days",
    requirements: [...PASSPORT_BASICS],
    active: true,
  },
  {
    id: "uganda-visa",
    category: "visa",
    country: "Uganda",
    flag: "🇺🇬",
    name: "Uganda Visa",
    serviceType: "Tourist",
    price: 180_000,
    currency: "NGN",
    processingTime: "24 hours – 7 days",
    validity: "90 days",
    requirements: [...PASSPORT_BASICS],
    active: true,
  },
  {
    id: "kenya-visa",
    category: "visa",
    country: "Kenya",
    flag: "🇰🇪",
    name: "Kenya Visa",
    serviceType: "Tourist",
    price: 150_000,
    currency: "NGN",
    processingTime: "24 hours – 7 days",
    validity: "90 days",
    requirements: [...PASSPORT_BASICS],
    active: true,
  },
  ...SCHENGEN_ITEMS,
  {
    id: "uae-tourist-30-days",
    category: "visa",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    name: "UAE Tourist Visa — 30 Days",
    description: "Single entry tourist visa for a stay of up to 30 days in the UAE.",
    serviceType: "Tourist",
    price: 300_000,
    currency: "NGN",
    processingTime: "5 – 7 working days",
    validity: "30 days",
    requirements: [...PASSPORT_BASICS],
    active: true,
  },
  {
    id: "uae-multiple-entry",
    category: "visa",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    name: "UAE Multiple Entry Visa",
    description: "Multiple entry visa for travellers making more than one trip to the UAE.",
    serviceType: "Tourist",
    price: 500_000,
    currency: "NGN",
    processingTime: "7 – 10 working days",
    requirements: [...PASSPORT_BASICS],
    active: true,
  },
  {
    id: "police-character-certificate",
    category: "police-character-certificate",
    country: "Nigeria",
    flag: "🇳🇬",
    name: "Police Character Certificate",
    description:
      "Nigerian police character certificate, processed after your biometric capturing appointment.",
    serviceType: "Travel document",
    price: 50_000,
    currency: "NGN",
    processingTime: "Maximum 48 hours after capturing",
    requirements: [...PASSPORT_BASICS],
    active: true,
  },
  {
    id: "proof-of-funds-support",
    category: "proof-of-funds",
    country: "Nigeria",
    flag: "🇳🇬",
    name: "Proof of Funds Support",
    description:
      "Guidance on the financial evidence your embassy expects, and help assembling it correctly.",
    serviceType: "Travel document",
    price: 0,
    currency: "NGN",
    processingTime: "Confirmed with your specialist",
    requirements: [...PASSPORT_BASICS, "Bank statement"],
    requiresQuote: true,
    active: true,
  },
  {
    id: "yellow-fever-card-support",
    category: "yellow-fever-card",
    country: "Nigeria",
    flag: "🇳🇬",
    name: "Yellow Fever Card Assistance",
    description: "Assistance obtaining the yellow fever vaccination card required by many destinations.",
    serviceType: "Travel document",
    price: 0,
    currency: "NGN",
    processingTime: "Confirmed with your specialist",
    requirements: [...PASSPORT_BASICS],
    requiresQuote: true,
    active: true,
  },
  {
    id: "travel-insurance-cover",
    category: "travel-insurance",
    country: "Worldwide",
    name: "Travel Medical Insurance",
    description: "Embassy-accepted travel medical insurance for the length of your trip.",
    serviceType: "Insurance",
    price: 0,
    currency: "NGN",
    processingTime: "Confirmed with your specialist",
    requirements: [...PASSPORT_BASICS],
    requiresQuote: true,
    active: true,
  },

];

export const ACTIVE_CATALOGUE = CATALOGUE.filter((item) => item.active);

export function findCatalogueItem(id: string | undefined | null): CatalogueItem | undefined {
  if (!id) return undefined;
  return CATALOGUE.find((item) => item.id === id);
}

/** Grouped options for a <select>: country → services. */
export function catalogueGroups(category?: CatalogueCategory) {
  const items = ACTIVE_CATALOGUE.filter((item) => !category || item.category === category);
  const groups = new Map<string, CatalogueItem[]>();
  for (const item of items) {
    const key = `${item.flag ? `${item.flag} ` : ""}${item.country}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries()).map(([country, options]) => ({ country, options }));
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function catalogueDisplayPrice(item: CatalogueItem): string {
  return `${item.priceFrom ? "From " : ""}${formatNaira(item.price)}`;
}

export const LONG_STAY_QUOTE_MESSAGE =
  "Your application requires a quotation review. Our specialist will review your request and provide the applicable fee before payment.";

/**
 * Quotation detection is based only on the customer's duration-of-stay answer.
 * Entry type (including multiple entry) and ordinary tourist, visit or business
 * categories never influence this decision.
 */
export function isLongStayDuration(durationOfStay?: string): boolean {
  const duration = (durationOfStay ?? "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-");
  if (!duration) return false;

  if (/\b(residence|residency|long[ -]?stay)\b/.test(duration)) return true;
  if (/\b(over|more than|longer than)\s+(six|6)\s+months?\b/.test(duration)) return true;
  if (/\b(?:[7-9]|1[0-9]|[2-9][0-9])\s*(?:\+\s*)?months?\b/.test(duration)) return true;
  if (/\b(?:1|2|3|4|5|6|7|8|9|one|two|three|four|five)\s*(?:\+\s*)?years?\b/.test(duration)) {
    return true;
  }

  // The current form's range option spans beyond the six-month threshold.
  return /\b6\s*-\s*12\s*months?\b/.test(duration) || /\bover\s+(?:a|one|1)\s+year\b/.test(duration);
}

export function needsCustomQuote(item: CatalogueItem | undefined, durationOfStay?: string) {
  if (item?.requiresQuote) return true;
  return item?.category === "visa" && isLongStayDuration(durationOfStay);
}
