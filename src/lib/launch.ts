/**
 * Launch mode — controls which services are fully live vs. "coming soon".
 *
 * A service that is NOT live is shown across the site as "Launching soon"
 * (enquiry-only): its booking/payment flow is replaced with a request-a-quote
 * panel, and its cards/CTAs point to /contact instead of the booking funnel.
 * None of the underlying code is removed — flip a service back to live here
 * (delete it from NOT_LIVE) the day it is ready, and it lights up everywhere.
 *
 * Ids cover both the category keys (service-categories.ts) and the marketing
 * slugs / wizard ids used around the app, so a single check works everywhere.
 */
const NOT_LIVE = new Set<string>([
  "hotels", // RateHawk certification + static-IP whitelisting pending
  "hotel",
  // Travel insurance is live: Sanlam Allianz production is verified (login,
  // lookups, plans and a live quote all confirmed via /admin/insurance).
]);

/** True when a service is fully live and can take bookings/payments now. */
export function isServiceLive(idOrSlug: string | undefined | null): boolean {
  if (!idOrSlug) return true;
  return !NOT_LIVE.has(idOrSlug);
}
