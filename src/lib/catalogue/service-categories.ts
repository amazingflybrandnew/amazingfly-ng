/**
 * Amazingfly Travels main service categories (client-safe).
 *
 * These are the seven customer-facing categories the website and the admin
 * package manager are organised around. Packages in the service catalogue
 * belong to exactly one of these categories.
 */

import type { CatalogueCategory } from "./visa-catalogue";

export type ServiceCategoryGroup = {
  /** Catalogue category key stored on every package. */
  key: CatalogueCategory;
  title: string;
  /** Short description used on cards and in the admin selector. */
  description: string;
  /** Plain-language explanation shown to the customer while choosing. */
  explanation: string;
  /** True when packages are organised per destination country. */
  hasDestination: boolean;
  /** Wizard category id in service-forms.ts. */
  wizardCategoryId: string;
  /** Slug of the marketing page in src/data/services.ts. */
  serviceSlug: string;
};

export const SERVICE_CATEGORY_GROUPS: ServiceCategoryGroup[] = [
  {
    key: "visa",
    title: "Visa Assistance",
    description: "Tourist, visit and business visa applications with full documentation support.",
    explanation:
      "Pick your destination, then choose the visa package that matches your trip. Each package shows the fee, the processing time and the documents we need from you.",
    hasDestination: true,
    wizardCategoryId: "visa",
    serviceSlug: "visa-assistance",
  },
  {
    key: "flights",
    title: "Flights",
    description: "Flight reservations, confirmed tickets and fare options for your journey.",
    explanation:
      "Search live fares and let our team issue or hold your ticket. Flight pricing depends on the route and date you select at search time.",
    hasDestination: true,
    wizardCategoryId: "flight",
    serviceSlug: "flights",
  },
  {
    key: "hotels",
    title: "Hotels",
    description: "Accommodation reservations worldwide, including embassy-ready confirmations.",
    explanation:
      "Search available hotels for your dates and we confirm the booking for you. Hotel pricing depends on the property and dates you select.",
    hasDestination: true,
    wizardCategoryId: "hotel",
    serviceSlug: "hotels",
  },
  {
    key: "proof-of-funds",
    title: "Proof of Funds",
    description: "Guidance and documentation support for financial evidence.",
    explanation:
      "We advise on the financial evidence your embassy expects and help you assemble it correctly.",
    hasDestination: false,
    wizardCategoryId: "documents",
    serviceSlug: "proof-of-funds",
  },
  {
    key: "police-character-certificate",
    title: "Police Character Certificate",
    description: "Nigerian police character certificate processing.",
    explanation:
      "We handle the capturing appointment and the certificate processing on your behalf.",
    hasDestination: false,
    wizardCategoryId: "documents",
    serviceSlug: "police-character-certificate",
  },
  {
    key: "yellow-fever-card",
    title: "Yellow Fever Card",
    description: "Yellow fever vaccination card assistance for travellers.",
    explanation:
      "We guide you through the vaccination card process required by several destinations.",
    hasDestination: false,
    wizardCategoryId: "documents",
    serviceSlug: "yellow-fever-card",
  },
  {
    key: "travel-insurance",
    title: "Travel Insurance",
    description: "Embassy-accepted travel medical insurance cover.",
    explanation:
      "Choose the cover level you need for your trip length and destination requirements.",
    hasDestination: false,
    wizardCategoryId: "insurance",
    serviceSlug: "travel-insurance",
  },
];

export const CATEGORY_KEYS = SERVICE_CATEGORY_GROUPS.map((group) => group.key);

export function findCategoryGroup(key: string | undefined | null) {
  if (!key) return undefined;
  return SERVICE_CATEGORY_GROUPS.find((group) => group.key === key);
}

export function categoryTitle(key: string): string {
  return findCategoryGroup(key)?.title ?? key;
}
