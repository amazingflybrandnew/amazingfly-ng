/**
 * Client-safe world country list with flag emojis, for the visa destination
 * search on the home page. Derived from the baked-in Sanlam Allianz country
 * lookup (ISO alpha-2 codes) so we don't ship a second copy of the world.
 *
 * The flag is rendered from the alpha-2 code using Unicode regional indicator
 * symbols, so no image assets are needed.
 */

import { ALLIANZ_COUNTRIES } from "@/lib/insurance/allianz-countries";

export type WorldCountry = {
  name: string;
  /** ISO alpha-2 code, uppercase. */
  alpha: string;
  /** Flag emoji derived from the alpha-2 code. */
  flag: string;
};

/** Turn an ISO alpha-2 code (e.g. "NG") into its flag emoji (🇳🇬). */
export function alphaToFlagEmoji(alpha: string): string {
  const code = (alpha || "").trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return "🏳️";
  const base = 0x1f1e6; // Regional Indicator Symbol Letter A
  return String.fromCodePoint(
    base + (code.charCodeAt(0) - 65),
    base + (code.charCodeAt(1) - 65),
  );
}

/** Nigeria is the fixed origin for every applicant. */
export const ORIGIN_COUNTRY: WorldCountry = {
  name: "Nigeria",
  alpha: "NG",
  flag: alphaToFlagEmoji("NG"),
};

/**
 * Every destination a traveller can apply for, sorted A→Z, deduped by name,
 * each with its flag. Nigeria itself is excluded (it's the origin).
 */
export const WORLD_COUNTRIES: readonly WorldCountry[] = (() => {
  const seen = new Set<string>();
  const list: WorldCountry[] = [];
  for (const c of ALLIANZ_COUNTRIES) {
    const key = c.name.toLowerCase();
    if (seen.has(key) || key === "nigeria") continue;
    seen.add(key);
    list.push({ name: c.name, alpha: c.alpha.toUpperCase(), flag: alphaToFlagEmoji(c.alpha) });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
})();

/**
 * A handful of popular visa destinations for the flag carousel / quick picks.
 * `source` is how the country is named in WORLD_COUNTRIES; `label` is the clean
 * name we want to show (the source list has a few verbose names).
 */
const POPULAR: readonly { source: string; label: string }[] = [
  { source: "Great Britain", label: "United Kingdom" },
  { source: "United States of America (USA)", label: "United States" },
  { source: "Canada", label: "Canada" },
  { source: "United Arab Emirates", label: "United Arab Emirates" },
  { source: "Germany", label: "Germany" },
  { source: "France", label: "France" },
  { source: "Italy", label: "Italy" },
  { source: "Spain", label: "Spain" },
  { source: "Netherlands", label: "Netherlands" },
  { source: "Turkey", label: "Turkey" },
  { source: "China", label: "China" },
  { source: "Australia", label: "Australia" },
  { source: "South Africa", label: "South Africa" },
  { source: "Ireland", label: "Ireland" },
  { source: "Switzerland", label: "Switzerland" },
  { source: "Saudi Arabia", label: "Saudi Arabia" },
  { source: "Qatar", label: "Qatar" },
  { source: "Malaysia", label: "Malaysia" },
  { source: "Singapore", label: "Singapore" },
  { source: "Japan", label: "Japan" },
];

/**
 * Flags to scroll in the marquee under the search box, with clean display
 * names. Falls back gracefully when a popular destination isn't in the source.
 */
export const CAROUSEL_FLAGS: readonly WorldCountry[] = POPULAR.map((p) => {
  const match = WORLD_COUNTRIES.find((c) => c.name.toLowerCase() === p.source.toLowerCase());
  return match ? { ...match, name: p.label } : undefined;
}).filter((c): c is WorldCountry => Boolean(c));
