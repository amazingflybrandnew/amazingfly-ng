import type { CancellationPolicy } from "./hotel.types";

/** Shared presentation helpers for the hotel experience. Safe on client + server. */

export function formatHotelPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

export function nightsBetween(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function perNightPrice(total: number, nights: number) {
  return nights > 0 ? total / nights : total;
}

export function formatStayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** ETG cancellation times are UTC+0; always show them in UTC, labelled. */
export function formatUtcDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const text = date.toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${text} UTC`;
}

function hasPassed(value: string, now: number) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now;
}

export function describeCancellation(refundable: boolean, until?: string | null) {
  if (!refundable) return "Non-refundable";
  if (!until) return "Free cancellation";
  if (hasPassed(until, Date.now())) return "Non-refundable";
  return `Free cancellation until ${formatUtcDateTime(until)}`;
}

/**
 * One line per ETG penalty period (all three layers), times in UTC. Periods
 * that have already ended are dropped; the current one is shown from now.
 */
export function cancellationPeriods(
  policy: CancellationPolicy,
  now: number = Date.now(),
): string[] {
  const periods = (policy.penalties ?? []).filter(
    (period) => !period.endAt || !hasPassed(period.endAt, now),
  );
  if (!periods.length) {
    return [describeCancellation(policy.refundable, policy.freeCancellationUntil)];
  }
  return periods.map((period) => {
    const startAt = period.startAt && !hasPassed(period.startAt, now) ? period.startAt : null;
    const window =
      startAt && period.endAt
        ? `${formatUtcDateTime(startAt)} – ${formatUtcDateTime(period.endAt)}`
        : startAt
          ? `From ${formatUtcDateTime(startAt)}`
          : period.endAt
            ? `Until ${formatUtcDateTime(period.endAt)}`
            : "Until check-in";
    const charge =
      period.amount > 0
        ? `cancellation fee ${formatHotelPrice(period.amount, period.currency)}`
        : "free cancellation";
    return `${window}: ${charge}`;
  });
}

/** Plain-text summary persisted with the booking request (max 400 chars). */
export function cancellationSummary(policy: CancellationPolicy): string {
  return cancellationPeriods(policy).join("; ").slice(0, 400);
}

/** Taxes payable at the hotel keep their original currency and decimals. */
export function formatTaxAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
