/**
 * Admin-side processing stages for Amazingfly Travels requests.
 *
 * Client-safe. This is a presentation layer derived from columns that already
 * exist (`request_status`, `payment_status`, document counts, pricing), so no
 * new request system is introduced and the flight / hotel / payment flows are
 * untouched.
 */

export const ADMIN_STAGES = [
  "submitted",
  "awaiting_documents",
  "awaiting_payment",
  "payment_received",
  "processing",
  "additional_documents_required",
  "completed",
  "cancelled",
] as const;

export type AdminStage = (typeof ADMIN_STAGES)[number];

export const ADMIN_STAGE_LABELS: Record<AdminStage, string> = {
  submitted: "Submitted",
  awaiting_documents: "Awaiting Documents",
  awaiting_payment: "Awaiting Payment",
  payment_received: "Paid / Ready for Processing",
  processing: "Processing",
  additional_documents_required: "Additional Documents Required",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type AdminStageInput = {
  request_status?: string | null;
  payment_status?: string | null;
  document_count?: number | null;
  outstanding_documents?: number | null;
  payment_amount?: number | null;
  requires_quote?: boolean | null;
};

export function isPaid(paymentStatus: string | null | undefined): boolean {
  const status = (paymentStatus ?? "").toLowerCase();
  return status === "payment_received" || status === "paid" || status === "successful";
}

export function deriveAdminStage(row: AdminStageInput): AdminStage {
  const status = (row.request_status ?? "").toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "additional_documents_required" || (row.outstanding_documents ?? 0) > 0) {
    return "additional_documents_required";
  }
  if (status === "processing" || status === "approved") return "processing";
  if (isPaid(row.payment_status)) return "payment_received";

  const docs = row.document_count ?? 0;
  const amount = row.payment_amount ?? 0;
  if (docs === 0) return "awaiting_documents";
  if (amount > 0) return "awaiting_payment";
  return "submitted";
}

export function adminStageTone(stage: AdminStage): string {
  switch (stage) {
    case "completed":
    case "payment_received":
      return "border-mint/50 bg-mint-tint text-navy";
    case "processing":
      return "border-lavender/50 bg-lavender-tint text-navy";
    case "awaiting_payment":
    case "additional_documents_required":
      return "border-orange/40 bg-peach-tint text-navy";
    case "cancelled":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-sky/50 bg-sky-tint text-navy";
  }
}

/** Message shown when payment protection blocks a processing action. */
export const PAYMENT_REQUIRED_MESSAGE =
  "Payment required before processing can begin.";
