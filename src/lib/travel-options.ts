/** Shared option catalogues for the Amazingfly Travels request journey. */

export type ServiceOptionItem = {
  /** Value stored in service_requests.service_type */
  value: string;
  label: string;
  /** Slug of the row in public.services this option is fulfilled by. */
  serviceSlug: string;
};

export type ServiceCategory = {
  category: string;
  options: ServiceOptionItem[];
};

export const SERVICE_CATALOG: ServiceCategory[] = [
  {
    category: "Visa Services",
    options: [
      { value: "tourist_visa", label: "Tourist Visa", serviceSlug: "visa-assistance" },
      { value: "business_visa", label: "Business Visa", serviceSlug: "visa-assistance" },
      { value: "student_visa", label: "Student Visa", serviceSlug: "visa-assistance" },
      { value: "work_visa", label: "Work Visa", serviceSlug: "visa-assistance" },
      { value: "transit_visa", label: "Transit Visa", serviceSlug: "visa-assistance" },
      { value: "family_visit_visa", label: "Family Visit Visa", serviceSlug: "visa-assistance" },
    ],
  },
  {
    category: "Flight Services",
    options: [
      { value: "flight_booking", label: "Flight Booking", serviceSlug: "flights" },
      { value: "flight_search_assistance", label: "Flight Search Assistance", serviceSlug: "flights" },
      { value: "airport_transfer", label: "Airport Transfer", serviceSlug: "flights" },
    ],
  },
  {
    category: "Hotel Services",
    options: [
      { value: "hotel_booking", label: "Hotel Booking", serviceSlug: "hotels" },
      { value: "accommodation_assistance", label: "Accommodation Assistance", serviceSlug: "hotels" },
    ],
  },
  {
    category: "Travel Documents",
    options: [
      { value: "passport_assistance", label: "Passport Assistance", serviceSlug: "police-character-certificate" },
      { value: "travel_insurance", label: "Travel Insurance", serviceSlug: "travel-insurance" },
      { value: "invitation_letter", label: "Invitation Letter", serviceSlug: "proof-of-funds" },
      { value: "other_documents", label: "Other Documents", serviceSlug: "proof-of-funds" },
    ],
  },
];

export const ALL_SERVICE_OPTIONS: ServiceOptionItem[] = SERVICE_CATALOG.flatMap((c) => c.options);

export const findServiceOption = (value: string) =>
  ALL_SERVICE_OPTIONS.find((option) => option.value === value);

/** Maps the simplified homepage hero slugs to a sensible default service type. */
export const HERO_SLUG_DEFAULTS: Record<string, string> = {
  "visa-assistance": "tourist_visa",
  flights: "flight_booking",
  hotels: "hotel_booking",
  "travel-insurance": "travel_insurance",
  "proof-of-funds": "other_documents",
  "police-character-certificate": "passport_assistance",
  "yellow-fever-card": "other_documents",
};

export const TRAVEL_PURPOSES = [
  "Tourism / Holiday",
  "Business",
  "Study",
  "Work",
  "Family visit",
  "Medical",
  "Transit",
  "Relocation",
  "Other",
];

export const CONTACT_METHODS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
] as const;

export const COUNTRIES = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "Cameroon",
  "Benin Republic",
  "United Kingdom",
  "United States",
  "Canada",
  "Ireland",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Schengen Countries",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Turkey",
  "China",
  "India",
  "Malaysia",
  "Australia",
  "New Zealand",
  "Brazil",
  "Other",
];

export const DOCUMENT_TYPES = [
  { value: "passport_copy", label: "Passport copy", hint: "Bio-data page" },
  { value: "passport_photograph", label: "Passport photograph", hint: "Recent, white background" },
  { value: "bank_statement", label: "Bank statement", hint: "Last 3–6 months" },
  { value: "invitation_letter", label: "Invitation letter", hint: "If applicable" },
  { value: "supporting_document", label: "Supporting document", hint: "Employment letter, ID, etc." },
  { value: "additional_file", label: "Additional file", hint: "Anything else useful" },
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
