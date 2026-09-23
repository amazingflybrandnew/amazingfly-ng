/**
 * Client-safe country list for the home page hero, now gated to the exact set
 * of destinations Amazingfly handles (VFS/visa-centre submission + e-Visa).
 * The single source of truth is src/lib/visa/destinations.ts.
 */

import {
  ORIGIN_COUNTRY as ORIGIN,
  VISA_DESTINATIONS,
  alphaToFlagEmoji,
} from "@/lib/visa/destinations";

export type WorldCountry = {
  name: string;
  /** ISO alpha-2 code, uppercase. */
  alpha: string;
  /** Flag emoji derived from the alpha-2 code. */
  flag: string;
  /** Destination page slug, e.g. "germany". */
  slug: string;
};

export { alphaToFlagEmoji };

/** Nigeria is the fixed origin for every applicant. */
export const ORIGIN_COUNTRY: WorldCountry = {
  name: ORIGIN.name,
  alpha: ORIGIN.alpha,
  flag: ORIGIN.flag,
  slug: "nigeria",
};

/** Every destination Amazingfly handles, sorted A→Z, each with its flag + slug. */
export const WORLD_COUNTRIES: readonly WorldCountry[] = [...VISA_DESTINATIONS]
  .map((d) => ({ name: d.name, alpha: d.alpha.toUpperCase(), flag: d.flag, slug: d.slug }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Popular destinations for the auto-scrolling flag carousel. */
export const CAROUSEL_FLAGS: readonly WorldCountry[] = VISA_DESTINATIONS.filter((d) => d.popular).map(
  (d) => ({ name: d.name, alpha: d.alpha.toUpperCase(), flag: d.flag, slug: d.slug }),
);
