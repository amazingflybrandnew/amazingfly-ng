/**
 * Document verification statuses (Task 3).
 *
 * Client-safe presentation layer shared by the customer request pages and the
 * admin review panel. It normalises the legacy values that already live in
 * `uploaded_documents.review_status` ("approved", "uploaded", empty) onto the
 * four business statuses, so no data has to be rewritten and the flight,
 * hotel, payment and request workflows are untouched.
 */

export const DOCUMENT_REVIEW_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "replacement_required",
] as const;

export type DocumentReviewStatus = (typeof DOCUMENT_REVIEW_STATUSES)[number];

export const DOCUMENT_STATUS_LABELS: Record<DocumentReviewStatus, string> = {
  pending: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
  replacement_required: "Replacement required",
};

/** Maps any stored value (including legacy ones) onto a business status. */
export function normalizeDocumentStatus(value: string | null | undefined): DocumentReviewStatus {
  const status = (value ?? "").toLowerCase().trim();
  if (status === "verified" || status === "approved") return "verified";
  if (status === "rejected") return "rejected";
  if (status === "replacement_required" || status === "replacement") return "replacement_required";
  return "pending";
}

export function documentStatusTone(value: string | null | undefined): string {
  switch (normalizeDocumentStatus(value)) {
    case "verified":
      return "border-mint/50 bg-mint-tint text-navy";
    case "rejected":
      return "border-coral/50 bg-peach-tint text-navy";
    case "replacement_required":
      return "border-orange/50 bg-peach-tint text-navy";
    default:
      return "border-sky/50 bg-sky-tint text-navy";
  }
}

export function documentStatusLabel(value: string | null | undefined): string {
  return DOCUMENT_STATUS_LABELS[normalizeDocumentStatus(value)];
}

/** True when the customer has to upload the file again. */
export function needsReplacement(value: string | null | undefined): boolean {
  const status = normalizeDocumentStatus(value);
  return status === "rejected" || status === "replacement_required";
}

export type DocumentProgress = {
  total: number;
  verified: number;
  pending: number;
  attention: number;
  /** Short line for cards: "3/4 verified" or "Documents require attention". */
  label: string;
  ready: boolean;
};

export function summariseDocuments(
  documents: { review_status?: string | null }[],
): DocumentProgress {
  const total = documents.length;
  let verified = 0;
  let attention = 0;
  for (const doc of documents) {
    const status = normalizeDocumentStatus(doc.review_status);
    if (status === "verified") verified += 1;
    else if (status !== "pending") attention += 1;
  }
  const pending = total - verified - attention;
  const label = !total
    ? "No documents uploaded"
    : attention > 0
      ? "Documents require attention"
      : `${verified}/${total} verified`;
  return { total, verified, pending, attention, label, ready: total > 0 && verified === total };
}
