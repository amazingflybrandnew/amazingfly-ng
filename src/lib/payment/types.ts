/**
 * Client-safe payment vocabulary for the Amazingfly Travels payment system.
 * No secrets, no provider calls — those live in `transactions.server.ts`.
 */

export const TRANSACTION_STATUSES = ["pending", "successful", "failed", "cancelled"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const PAYMENT_TYPES = [
  "flight_booking",
  "hotel_booking",
  "visa_service",
  "travel_service",
] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_PROVIDERS = ["paystack", "flutterwave", "manual"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export type PaymentTransaction = {
  id: string;
  request_id: string | null;
  request_reference: string | null;
  transaction_reference: string;
  provider: PaymentProvider;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: "Pending",
  successful: "Successful",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  flight_booking: "Flight booking",
  hotel_booking: "Hotel booking",
  visa_service: "Visa service",
  travel_service: "Travel service",
};

export function normalizeTransactionStatus(value: unknown): TransactionStatus {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (TRANSACTION_STATUSES as readonly string[]).includes(raw)
    ? (raw as TransactionStatus)
    : "pending";
}

export function normalizePaymentType(value: unknown): PaymentType {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (PAYMENT_TYPES as readonly string[]).includes(raw)
    ? (raw as PaymentType)
    : "travel_service";
}

export function transactionStatusLabel(value: unknown): string {
  return TRANSACTION_STATUS_LABELS[normalizeTransactionStatus(value)];
}

export function paymentTypeLabel(value: unknown): string {
  return PAYMENT_TYPE_LABELS[normalizePaymentType(value)];
}

export function transactionTone(value: unknown): string {
  switch (normalizeTransactionStatus(value)) {
    case "successful":
      return "border-mint/50 bg-mint-tint text-navy";
    case "failed":
      return "border-coral/50 bg-peach-tint text-navy";
    case "cancelled":
      return "border-lavender/50 bg-lavender-tint text-navy";
    default:
      return "border-sky/50 bg-sky-tint text-navy";
  }
}

/** Maps an existing request's service type onto a payment type. */
export function paymentTypeForService(serviceType: string | null | undefined): PaymentType {
  const value = (serviceType ?? "").toLowerCase();
  if (value.includes("flight")) return "flight_booking";
  if (value.includes("hotel")) return "hotel_booking";
  if (value.includes("visa")) return "visa_service";
  return "travel_service";
}
