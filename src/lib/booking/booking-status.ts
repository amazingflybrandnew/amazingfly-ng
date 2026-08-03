/**
 * Client-safe airline booking status vocabulary.
 * Stored in `service_requests.booking_status` — no new booking table.
 */

export const BOOKING_STATUSES = [
  "pending",
  "on_hold",
  "awaiting_payment",
  "paid",
  "confirmed",
  "expired",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  on_hold: "On hold",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  confirmed: "Confirmed",
  expired: "Expired",
  cancelled: "Cancelled",
};

const TONES: Record<BookingStatus, string> = {
  pending: "border-white/70 bg-white/70 text-navy-soft",
  on_hold: "border-peach/60 bg-peach-tint text-navy",
  awaiting_payment: "border-peach/60 bg-peach-tint text-navy",
  paid: "border-mint/60 bg-mint-tint text-navy",
  confirmed: "border-mint/60 bg-mint-tint text-navy",
  expired: "border-coral/50 bg-coral-tint text-navy",
  cancelled: "border-coral/50 bg-coral-tint text-navy",
};

export function normalizeBookingStatus(value: unknown): BookingStatus {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if ((BOOKING_STATUSES as readonly string[]).includes(raw)) return raw as BookingStatus;
  if (raw === "not_booked" || raw === "") return "pending";
  return "pending";
}

export function bookingStatusLabel(value: unknown): string {
  return BOOKING_STATUS_LABELS[normalizeBookingStatus(value)];
}

export function bookingStatusTone(value: unknown): string {
  return TONES[normalizeBookingStatus(value)];
}
