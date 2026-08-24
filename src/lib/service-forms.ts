/**
 * Dynamic, config-driven request forms.
 *
 * Every service category declares its own sections, questions and required
 * documents. The wizard renders whatever is declared here, so adding a new
 * service never requires touching the wizard UI.
 *
 * Question ids listed in CORE_FIELD_IDS are mapped onto dedicated
 * service_requests columns; every other answer is stored dynamically.
 */
import { PROOF_OF_FUNDS_BANKS } from "./catalogue/service-pricing";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "country"
  | "catalogue";

export type Question = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
  /** Render at half width inside a two-column grid. */
  half?: boolean;
  /** Only show when another question has one of these values. */
  showIf?: { id: string; equals: string[] };
  min?: number;
  max?: number;
  /** For `catalogue` questions: which service category's packages to offer. */
  catalogueCategory?:
    | "visa"
    | "flights"
    | "hotels"
    | "proof-of-funds"
    | "police-character-certificate"
    | "yellow-fever-card"
    | "travel-insurance";
};

export type Section = {
  title: string;
  description?: string;
  questions: Question[];
};

export type DocumentRequirement = {
  value: string;
  label: string;
  hint?: string;
  required?: boolean;
  showIf?: { id: string; equals: string[] };
};

export type ServiceCategory = {
  id: string;
  name: string;
  tagline: string;
  /** Slug of the row in public.services this category is fulfilled by. */
  serviceSlug: string;
  sections: Section[];
  documents: DocumentRequirement[];
};

/** Answers with these ids are written to real columns on service_requests. */
export const CORE_FIELD_IDS = [
  "origin_country",
  "destination_country",
  "travel_purpose",
  "travel_date",
  "return_date",
  "traveller_count",
  "passport_number",
  "passport_country",
  "date_of_birth",
  "passport_issue_date",
  "passport_expiry_date",
] as const;

const CONTACT_SECTION: Section = {
  title: "Contact Information",
  description: "How our travel specialists reach you about this request.",
  questions: [
    { id: "full_name", label: "Full name", type: "text", required: true },
    { id: "email", label: "Email address", type: "email", required: true, half: true },
    { id: "phone", label: "Phone number", type: "tel", required: true, half: true },
    { id: "whatsapp", label: "WhatsApp number", type: "tel", half: true },
    {
      id: "country_of_residence",
      label: "Country of residence",
      type: "country",
      required: true,
      half: true,
    },
    {
      id: "preferred_contact",
      label: "Preferred contact method",
      type: "radio",
      required: true,
      options: ["WhatsApp", "Phone call", "Email"],
    },
  ],
};

/** Amazingfly Travels only offers these visa categories. */
const VISA_TYPES = ["Tourist", "Visit", "Business"];

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "visa",
    name: "Visa Application",
    tagline: "Tourist, business, student, work, family visit or transit visas.",
    serviceSlug: "visa-assistance",
    sections: [
      {
        title: "Destination Information",
        description:
          "Choose the visa service you need. The price, processing time and required documents are shown as soon as you select it.",
        questions: [
          {
            id: "catalogue_id",
            label: "Visa package",
            type: "catalogue",
            catalogueCategory: "visa",
            required: true,
          },
          {
            id: "visa_type",
            label: "Visa category",
            type: "select",
            required: true,
            options: VISA_TYPES,
            half: true,
          },
        ],
      },
      {
        title: "Travel Information",
        questions: [
          {
            id: "travel_date",
            label: "Intended travel date",
            type: "date",
            required: true,
            half: true,
          },
          {
            id: "duration_of_stay",
            label: "Duration of stay",
            type: "select",
            required: true,
            options: [
              "Up to 2 weeks",
              "2–4 weeks",
              "1–3 months",
              "3–6 months",
              "6–12 months",
              "Over a year",
            ],
            half: true,
          },
          {
            id: "entries_required",
            label: "Number of entries required",
            type: "radio",
            required: true,
            options: ["Single entry", "Multiple entry"],
          },
          {
            id: "traveller_count",
            label: "Number of applicants",
            type: "number",
            min: 1,
            max: 30,
            half: true,
          },
        ],
      },
      {
        title: "Personal Information",
        questions: [
          { id: "full_name", label: "Full name", type: "text", required: true },
          { id: "date_of_birth", label: "Date of birth", type: "date", required: true, half: true },
          {
            id: "origin_country",
            label: "Nationality",
            type: "country",
            required: true,
            half: true,
          },
          {
            id: "country_of_residence",
            label: "Country of residence",
            type: "country",
            required: true,
            half: true,
          },
          { id: "occupation", label: "Occupation", type: "text", half: true },
          {
            id: "marital_status",
            label: "Marital status",
            type: "select",
            options: ["Single", "Married", "Divorced", "Widowed"],
            half: true,
          },
        ],
      },
      {
        title: "Passport Information",
        questions: [
          { id: "passport_number", label: "Passport number", type: "text", half: true },
          {
            id: "passport_country",
            label: "Passport issuing country",
            type: "country",
            half: true,
          },
          { id: "passport_issue_date", label: "Passport issue date", type: "date", half: true },
          { id: "passport_expiry_date", label: "Passport expiry date", type: "date", half: true },
          {
            id: "previous_travel_history",
            label: "Previous travel history",
            type: "textarea",
            placeholder: "Countries visited in the last 10 years, with approximate dates.",
          },
        ],
      },
      {
        title: "Supporting Information",
        questions: [
          {
            id: "previous_refusal",
            label: "Have you had a previous visa refusal?",
            type: "radio",
            required: true,
            options: ["No", "Yes"],
          },
          {
            id: "previous_refusal_details",
            label: "Previous visa details",
            type: "textarea",
            placeholder: "Country, year and reason given for the refusal.",
            showIf: { id: "previous_refusal", equals: ["Yes"] },
          },
          { id: "additional_comments", label: "Additional comments", type: "textarea" },
        ],
      },
    ],
    documents: [
      { value: "passport_bio_page", label: "Passport bio page", required: true },
      {
        value: "passport_photograph",
        label: "Passport photograph",
        hint: "Recent, white background",
        required: true,
      },
      { value: "bank_statement", label: "Bank statement", hint: "Last 3–6 months" },
      { value: "employment_letter", label: "Employment letter" },
      { value: "invitation_letter", label: "Invitation letter", hint: "If applicable" },
      { value: "accommodation_details", label: "Accommodation details" },
      {
        value: "flight_itinerary",
        label: "Flight itinerary (optional)",
        hint: "Optional — Amazingfly Travels can prepare this for you.",
      },
      {
        value: "hotel_itinerary",
        label: "Hotel itinerary (optional)",
        hint: "Optional — Amazingfly Travels can prepare this for you.",
      },
    ],
  },
  {
    id: "flight",
    name: "Flight Booking",
    tagline: "Reservations, confirmed tickets and fare options.",
    serviceSlug: "flights",
    sections: [
      {
        title: "Travel Details",
        questions: [
          {
            id: "origin_country",
            label: "Departure location",
            type: "country",
            required: true,
            half: true,
          },
          {
            id: "destination_country",
            label: "Destination",
            type: "country",
            required: true,
            half: true,
          },
          {
            id: "trip_type",
            label: "Ticket type",
            type: "radio",
            required: true,
            options: ["One way", "Return"],
          },
          {
            id: "travel_date",
            label: "Departure date",
            type: "date",
            required: true,
            half: true,
          },
          {
            id: "return_date",
            label: "Return date",
            type: "date",
            half: true,
            showIf: { id: "trip_type", equals: ["Return"] },
          },
        ],
      },
      {
        title: "Passenger Details",
        questions: [
          { id: "full_name", label: "Full name (as on passport)", type: "text", required: true },
          { id: "date_of_birth", label: "Date of birth", type: "date", half: true },
          {
            id: "passport_country",
            label: "Passport nationality",
            type: "country",
            required: true,
            half: true,
          },
          {
            id: "traveller_count",
            label: "Number of passengers",
            type: "number",
            required: true,
            min: 1,
            max: 30,
            half: true,
          },
        ],
      },
      {
        title: "Preferences",
        questions: [
          {
            id: "cabin_class",
            label: "Cabin class",
            type: "radio",
            required: true,
            options: ["Economy", "Premium Economy", "Business", "First"],
          },
          { id: "preferred_airline", label: "Preferred airline", type: "text", half: true },
          {
            id: "budget_range",
            label: "Budget range",
            type: "select",
            options: [
              "Under ₦500,000",
              "₦500,000 – ₦1,000,000",
              "₦1,000,000 – ₦2,500,000",
              "Above ₦2,500,000",
              "Flexible",
            ],
            half: true,
          },
          { id: "special_requests", label: "Special requests", type: "textarea" },
        ],
      },
    ],
    documents: [
      { value: "passport_bio_page", label: "Passport bio page", hint: "For ticket issuing" },
      { value: "additional_file", label: "Any other document" },
    ],
  },
  {
    id: "hotel",
    name: "Hotel Booking",
    tagline: "Accommodation reservations worldwide.",
    serviceSlug: "hotels",
    sections: [
      {
        title: "Accommodation Details",
        questions: [
          {
            id: "destination_country",
            label: "Destination country",
            type: "country",
            required: true,
            half: true,
          },
          { id: "destination_city", label: "Destination city", type: "text", required: true, half: true },
          { id: "travel_date", label: "Check-in date", type: "date", required: true, half: true },
          { id: "return_date", label: "Check-out date", type: "date", required: true, half: true },
          {
            id: "traveller_count",
            label: "Number of guests",
            type: "number",
            required: true,
            min: 1,
            max: 30,
            half: true,
          },
          {
            id: "room_count",
            label: "Number of rooms",
            type: "number",
            required: true,
            min: 1,
            max: 20,
            half: true,
          },
        ],
      },
      {
        title: "Preferences",
        questions: [
          {
            id: "hotel_category",
            label: "Hotel category",
            type: "radio",
            required: true,
            options: ["3 star", "4 star", "5 star"],
          },
          {
            id: "room_preference",
            label: "Room preference",
            type: "select",
            options: ["Single", "Double", "Twin", "Suite", "Family room", "No preference"],
            half: true,
          },
          {
            id: "budget_range",
            label: "Budget range per night",
            type: "select",
            options: [
              "Under ₦100,000",
              "₦100,000 – ₦250,000",
              "₦250,000 – ₦500,000",
              "Above ₦500,000",
              "Flexible",
            ],
            half: true,
          },
          { id: "special_requests", label: "Special requests", type: "textarea" },
        ],
      },
    ],
    documents: [
      { value: "passport_bio_page", label: "Passport bio page", hint: "Often required at check-in" },
      { value: "additional_file", label: "Any other document" },
    ],
  },
  {
    id: "documents",
    name: "Travel Documents",
    tagline: "Police character certificate, proof of funds and other travel documents.",
    serviceSlug: "proof-of-funds",
    sections: [
      {
        title: "Document Requirement",
        questions: [
          {
            id: "document_service",
            label: "Document type required",
            type: "select",
            required: true,
            options: [
              "Police character certificate",
              "Proof of funds",
              "Yellow fever card",
              "Travel insurance",
              "Other documents",
            ],
          },
          {
            id: "pof_bank",
            label: "Proof of Funds bank",
            type: "select",
            required: true,
            options: [...PROOF_OF_FUNDS_BANKS],
            half: true,
            showIf: { id: "document_service", equals: ["Proof of funds"] },
          },
          {
            id: "pof_amount",
            label: "Proof of Funds amount required (₦)",
            type: "number",
            required: true,
            min: 1,
            half: true,
            hint: "Enter the amount you need shown as Proof of Funds. Your service fee is calculated from the selected bank's rate.",
            showIf: { id: "document_service", equals: ["Proof of funds"] },
          },
          {
            id: "document_details",
            label: "Tell us more about what you need",
            type: "textarea",
          },
        ],
      },
      {
        title: "Applicant & Travel Details",
        questions: [
          {
            id: "destination_country",
            label: "Destination",
            type: "country",
            required: true,
            half: true,
          },
          { id: "travel_date", label: "Travel date", type: "date", required: true, half: true },
          {
            id: "travel_purpose",
            label: "Purpose of travel",
            type: "select",
            required: true,
            options: [
              "Tourism / Holiday",
              "Business",
              "Study",
              "Work",
              "Family visit",
              "Medical",
              "Transit",
              "Relocation",
              "Other",
            ],
            half: true,
          },
          {
            id: "origin_country",
            label: "Nationality",
            type: "country",
            required: true,
            half: true,
          },
          { id: "full_name", label: "Full name", type: "text", required: true, half: true },
          { id: "date_of_birth", label: "Date of birth", type: "date", half: true },
          { id: "passport_number", label: "Passport number", type: "text", half: true },
        ],
      },
    ],
    documents: [
      { value: "passport_bio_page", label: "Passport bio page", required: true },
      { value: "passport_photograph", label: "Passport photograph", required: true },
      {
        value: "supporting_document",
        label: "Supporting document",
        hint: "Optional",
      },
      {
        value: "additional_file",
        label: "Any other document",
        hint: "Optional",
      },
    ],
  },
  {
    id: "insurance",
    name: "Travel Insurance",
    tagline: "Embassy-accepted travel medical insurance.",
    serviceSlug: "travel-insurance",
    sections: [
      {
        title: "Cover Details",
        questions: [
          {
            id: "destination_country",
            label: "Destination country",
            type: "country",
            required: true,
            half: true,
          },
          {
            id: "travel_date",
            label: "Cover start date",
            type: "date",
            required: true,
            half: true,
          },
          { id: "return_date", label: "Cover end date", type: "date", half: true },
          {
            id: "traveller_count",
            label: "Number of travellers",
            type: "number",
            required: true,
            min: 1,
            max: 30,
            half: true,
          },
          {
            id: "cover_level",
            label: "Cover level required",
            type: "select",
            options: ["Schengen standard (€30,000)", "Standard", "Comprehensive", "Not sure"],
            half: true,
          },
          {
            id: "medical_conditions",
            label: "Any pre-existing medical conditions?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Applicant Details",
        questions: [
          { id: "full_name", label: "Full name", type: "text", required: true, half: true },
          { id: "date_of_birth", label: "Date of birth", type: "date", required: true, half: true },
          { id: "passport_number", label: "Passport number", type: "text", half: true },
          { id: "origin_country", label: "Nationality", type: "country", half: true },
        ],
      },
    ],
    documents: [
      { value: "passport_bio_page", label: "Passport bio page" },
      { value: "additional_file", label: "Any other document" },
    ],
  },
  {
    id: "airport_transfer",
    name: "Airport Transfer",
    tagline: "Reliable pick-up and drop-off around your flight.",
    serviceSlug: "flights",
    sections: [
      {
        title: "Transfer Details",
        questions: [
          {
            id: "origin_country",
            label: "Pick-up country",
            type: "country",
            required: true,
            half: true,
          },
          { id: "pickup_location", label: "Pick-up location", type: "text", required: true, half: true },
          {
            id: "destination_country",
            label: "Drop-off country",
            type: "country",
            required: true,
            half: true,
          },
          { id: "dropoff_location", label: "Drop-off location", type: "text", required: true, half: true },
          { id: "travel_date", label: "Transfer date", type: "date", required: true, half: true },
          { id: "pickup_time", label: "Pick-up time", type: "text", placeholder: "e.g. 14:30", half: true },
          {
            id: "traveller_count",
            label: "Number of passengers",
            type: "number",
            required: true,
            min: 1,
            max: 30,
            half: true,
          },
          {
            id: "vehicle_preference",
            label: "Vehicle preference",
            type: "select",
            options: ["Saloon car", "SUV", "Van / minibus", "Executive", "No preference"],
            half: true,
          },
          { id: "flight_number", label: "Flight number (if known)", type: "text", half: true },
          { id: "special_requests", label: "Special requests", type: "textarea" },
        ],
      },
    ],
    documents: [{ value: "flight_itinerary", label: "Flight itinerary" }],
  },
  {
    id: "other",
    name: "Other Services",
    tagline: "Anything else — tell us what you need.",
    serviceSlug: "proof-of-funds",
    sections: [
      {
        title: "Your Request",
        questions: [
          {
            id: "request_summary",
            label: "What do you need help with?",
            type: "textarea",
            required: true,
          },
          {
            id: "destination_country",
            label: "Destination (if relevant)",
            type: "country",
            half: true,
          },
          { id: "travel_date", label: "Travel date (if relevant)", type: "date", half: true },
          { id: "full_name", label: "Full name", type: "text", required: true, half: true },
          { id: "origin_country", label: "Nationality", type: "country", half: true },
        ],
      },
    ],
    documents: [{ value: "additional_file", label: "Any supporting document" }],
  },
];

export const findCategory = (id: string | undefined) =>
  SERVICE_CATEGORIES.find((category) => category.id === id);

/** Homepage hero service slugs → dynamic category id. */
export const HERO_SLUG_TO_CATEGORY: Record<string, string> = {
  "visa-assistance": "visa",
  flights: "flight",
  hotels: "hotel",
  "travel-insurance": "insurance",
  "proof-of-funds": "documents",
  "police-character-certificate": "documents",
  "yellow-fever-card": "documents",
  visa: "visa",
  flight: "flight",
  hotel: "hotel",
  documents: "documents",
  insurance: "insurance",
  "airport-transfer": "airport_transfer",
  other: "other",
};

/** Builds the full ordered section list for a category (questions + contact). */
export function buildSections(category: ServiceCategory): Section[] {
  const seen = new Set(
    category.sections.flatMap((section) => section.questions.map((q) => q.id)),
  );
  const contact: Section = {
    ...CONTACT_SECTION,
    questions: CONTACT_SECTION.questions.filter((q) => !seen.has(q.id)),
  };
  return [...category.sections, contact];
}

export const isCoreField = (id: string) =>
  (CORE_FIELD_IDS as readonly string[]).includes(id);
