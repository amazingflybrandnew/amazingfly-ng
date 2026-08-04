/**
 * Universal customer-facing workflow status for every Amazingfly Travels
 * request (visa, document, flight or hotel).
 *
 * This is a presentation layer derived from the columns that already exist —
 * `request_status`, `payment_status`, `booking_status`, document count and the
 * quotation flag — so nothing in the existing flows has to change.
 */

export const WORKFLOW_STATUSES = [
  "submitted",
  "documents_uploaded",
  "quotation_pending",
  "payment_pending",
  "payment_successful",
  "processing",
  "completed",
  "cancelled",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  submitted: "Submitted",
  documents_uploaded: "Documents Uploaded",
  quotation_pending: "Awaiting Quotation",
  payment_pending: "Payment Pending",
  payment_successful: "Payment Successful",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type WorkflowInput = {
  request_status?: string | null;
  payment_status?: string | null;
  booking_status?: string | null;
  document_count?: number | null;
  requires_quote?: boolean | null;
  amount?: number | null;
};

export function deriveWorkflowStatus(request: WorkflowInput): WorkflowStatus {
  const requestStatus = (request.request_status ?? "").toLowerCase();
  const paymentStatus = (request.payment_status ?? "").toLowerCase();

  if (requestStatus === "cancelled") return "cancelled";
  if (requestStatus === "completed") return "completed";

  const paid = paymentStatus === "payment_received" || paymentStatus === "paid";
  if (paid) {
    if (requestStatus === "processing" || requestStatus === "approved") return "processing";
    return "payment_successful";
  }

  if (request.requires_quote && !(request.amount && request.amount > 0)) {
    return "quotation_pending";
  }

  const docs = request.document_count ?? 0;
  if (docs > 0) {
    return request.amount && request.amount > 0 ? "payment_pending" : "documents_uploaded";
  }
  return "submitted";
}

export function workflowLabel(status: WorkflowStatus): string {
  return WORKFLOW_LABELS[status];
}

export function workflowTone(status: WorkflowStatus): string {
  switch (status) {
    case "completed":
    case "payment_successful":
      return "border-mint/50 bg-mint-tint text-navy";
    case "processing":
      return "border-lavender/50 bg-lavender-tint text-navy";
    case "payment_pending":
      return "border-orange/40 bg-peach-tint text-navy";
    case "quotation_pending":
      return "border-coral/40 bg-peach-tint text-navy";
    case "cancelled":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-sky/50 bg-sky-tint text-navy";
  }
}

/** Ordered stages shown on the customer timeline. */
export const WORKFLOW_TIMELINE: WorkflowStatus[] = [
  "submitted",
  "documents_uploaded",
  "payment_pending",
  "payment_successful",
  "processing",
  "completed",
];

export function workflowIndex(status: WorkflowStatus): number {
  if (status === "cancelled") return -1;
  if (status === "quotation_pending") return 1;
  return WORKFLOW_TIMELINE.indexOf(status);
}
