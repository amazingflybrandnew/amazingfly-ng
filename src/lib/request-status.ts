export const REQUEST_STATUSES = [
  "new_request",
  "under_review",
  "documents_required",
  "additional_documents_required",
  "processing",
  "approved",
  "completed",
  "cancelled",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  new_request: "New Request",
  received: "New Request",
  under_review: "Under Review",
  documents_required: "Documents Required",
  additional_documents_required: "Additional Documents Required",
  processing: "Processing",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
};


/** Visual progression used by the tracking timeline. */
export const TIMELINE_STEPS: { status: RequestStatus; label: string; hint: string }[] = [
  { status: "new_request", label: "Request Submitted", hint: "We received your request" },
  { status: "under_review", label: "Information Reviewed", hint: "Our specialists are checking it" },
  {
    status: "documents_required",
    label: "Documents Verification",
    hint: "Documents are being verified",
  },
  { status: "processing", label: "Processing", hint: "Your application is in progress" },
  { status: "completed", label: "Completed", hint: "Everything is ready" },
];

export function statusIndex(status: string): number {
  const normalised = status === "received" ? "new_request" : status;
  if (normalised === "approved") return 3;
  if (normalised === "cancelled") return -1;
  const index = TIMELINE_STEPS.findIndex((step) => step.status === normalised);
  return index === -1 ? 0 : index;
}

export function statusTone(status: string): string {
  switch (status) {
    case "completed":
    case "approved":
      return "bg-mint-tint text-navy border-mint/50";
    case "documents_required":
    case "additional_documents_required":
      return "bg-peach-tint text-navy border-orange/40";

    case "cancelled":
      return "bg-muted text-muted-foreground border-border";
    case "processing":
      return "bg-lavender-tint text-navy border-lavender/50";
    default:
      return "bg-sky-tint text-navy border-sky/50";
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
