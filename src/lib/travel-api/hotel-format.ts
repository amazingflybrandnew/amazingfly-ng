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

export function describeCancellation(refundable: boolean, until?: string | null) {
  if (!refundable) return "Non-refundable";
  if (!until) return "Free cancellation";
  return `Free cancellation until ${formatStayDate(until)}`;
}
