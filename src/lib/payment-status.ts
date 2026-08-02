/**
 * Shared (client-safe) payment vocabulary for Amazingfly Travels.
 * Keeping the labels here means the dashboard, payment page and admin area
 * always describe a payment the same way.
 */

export const PAYMENT_STATUSES = [
  "pending_payment",
  "payment_received",
  "payment_failed",
  "refund_requested",
  "refund_completed",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  payment_received: "Payment Received",
  payment_failed: "Payment Failed",
  refund_requested: "Refund Requested",
  refund_completed: "Refund Completed",
};

/** Older Stage-2 values still present on historic rows. */
const LEGACY: Record<string, PaymentStatus> = {
  unpaid: "pending_payment",
  pending: "pending_payment",
  paid: "payment_received",
  failed: "payment_failed",
  refunded: "refund_completed",
};

export function normalizePaymentStatus(value: unknown): PaymentStatus {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if ((PAYMENT_STATUSES as readonly string[]).includes(raw)) return raw as PaymentStatus;
  return LEGACY[raw] ?? "pending_payment";
}

export function paymentStatusLabel(value: unknown): string {
  const status = normalizePaymentStatus(value);
  return PAYMENT_STATUS_LABELS[status] ?? "Pending Payment";
}

export function paymentTone(value: unknown): string {
  switch (normalizePaymentStatus(value)) {
    case "payment_received":
      return "border-mint/50 bg-mint-tint text-navy";
    case "payment_failed":
      return "border-coral/50 bg-peach-tint text-navy";
    case "refund_requested":
      return "border-orange/40 bg-peach-tint text-navy";
    case "refund_completed":
      return "border-lavender/50 bg-lavender-tint text-navy";
    default:
      return "border-sky/50 bg-sky-tint text-navy";
  }
}

export function formatMoney(amount: number | null | undefined, currency = "NGN"): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "To be confirmed";
  }
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}
