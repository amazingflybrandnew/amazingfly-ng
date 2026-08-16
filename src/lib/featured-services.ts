/**
 * Featured services — presentation-layer types and temporary sample data.
 *
 * UI ONLY: no database, storage or server functions are involved here.
 * A backend can later supply `FeaturedService[]` (and CRUD handlers) with the
 * exact same shape without any redesign of the UI components.
 */

import policeImage from "@/assets/featured-police-certificate.jpg";
import proofOfFundsImage from "@/assets/featured-proof-of-funds.jpg";
import visaImage from "@/assets/featured-visa.jpg";
import flightsImage from "@/assets/featured-flights.jpg";
import hotelsImage from "@/assets/featured-hotels.jpg";

export type FeaturedService = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  /** Internal application path, e.g. "/services/visa-assistance". */
  link_path: string;
  display_order: number;
  is_active: boolean;
};

/** Temporary preview data — replace with backend-provided rows later. */
export const SAMPLE_FEATURED_SERVICES: FeaturedService[] = [
  {
    id: "police-character-certificate",
    title: "Police Character Certificate",
    description:
      "Support with applying for and collecting your Nigerian police character certificate for travel and immigration use.",
    image_url: policeImage,
    link_path: "/services/police-character-certificate",
    display_order: 1,
    is_active: true,
  },
  {
    id: "proof-of-funds",
    title: "Proof of Funds",
    description:
      "Guidance on preparing the financial documents embassies expect to see with your application.",
    image_url: proofOfFundsImage,
    link_path: "/services/proof-of-funds",
    display_order: 2,
    is_active: true,
  },
  {
    id: "visa-applications",
    title: "Visa Applications",
    description:
      "Destination-specific visa guidance, document checklists and application review by real specialists.",
    image_url: visaImage,
    link_path: "/services/visa-assistance",
    display_order: 3,
    is_active: true,
  },
  {
    id: "flight-booking",
    title: "Flight Booking",
    description:
      "Search live routes and fares, then let our team handle the booking and ticketing details.",
    image_url: flightsImage,
    link_path: "/flights",
    display_order: 4,
    is_active: true,
  },
  {
    id: "hotels",
    title: "Hotels",
    description:
      "Find and reserve verified stays worldwide, with confirmations suitable for visa applications.",
    image_url: hotelsImage,
    link_path: "/hotels",
    display_order: 5,
    is_active: true,
  },
];

/** Sorts by display order and drops inactive entries. */
export function visibleFeaturedServices(items: FeaturedService[]): FeaturedService[] {
  return items
    .filter((item) => item.is_active)
    .slice()
    .sort((a, b) => a.display_order - b.display_order);
}
