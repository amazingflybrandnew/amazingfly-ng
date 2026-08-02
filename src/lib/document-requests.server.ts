/**
 * Server-only access to the `document_requests` table (Stage 4 improvement).
 *
 * Every row is a document our specialists asked a customer to provide for a
 * specific travel request. The table is optional at runtime: if the migration
 * has not been applied yet, every helper degrades to an empty result instead
 * of breaking the dashboard.
 */
import type { DocumentRequestItem } from "./account.functions";

async function admin() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

const COLUMNS =
  "id, request_id, document_name, description, required_status, uploaded_status, created_at";

type UploadedLink = {
  document_id: string;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string;
};

/** Uploaded files keyed by the document request they satisfy. */
async function fetchLinks(requestIds: string[]): Promise<Map<string, UploadedLink>> {
  const links = new Map<string, UploadedLink>();
  if (!requestIds.length) return links;
  const supabase = await admin();
  const { data, error } = await supabase
    .from("uploaded_documents")
    .select("id, document_request_id, file_name, file_size, uploaded_at")
    .in("request_id", requestIds)
    .order("uploaded_at", { ascending: false });
  if (error || !data) return links;
  for (const row of data) {
    const key = row["document_request_id"] as string | null;
    if (!key || links.has(key)) continue;
    links.set(key, {
      document_id: String(row["id"]),
      file_name: (row["file_name"] as string | null) ?? null,
      file_size: (row["file_size"] as number | null) ?? null,
      uploaded_at: String(row["uploaded_at"] ?? ""),
    });
  }
  return links;
}

export async function fetchDocumentRequests(
  requestIds: string[],
  referenceById: Map<string, string>,
): Promise<DocumentRequestItem[]> {
  if (!requestIds.length) return [];
  const supabase = await admin();
  const { data, error } = await supabase
    .from("document_requests")
    .select(COLUMNS)
    .in("request_id", requestIds)
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const links = await fetchLinks(requestIds);

  return data.map((row) => {
    const id = String(row["id"]);
    const link = links.get(id);
    const status = String(row["uploaded_status"] ?? "pending");
    return {
      id,
      request_id: String(row["request_id"]),
      request_reference: referenceById.get(String(row["request_id"])) ?? "",
      document_name: String(row["document_name"] ?? "Document"),
      description: (row["description"] as string | null) ?? null,
      required_status: String(row["required_status"] ?? "required"),
      uploaded_status: link && status === "pending" ? "uploaded" : status,
      created_at: String(row["created_at"] ?? ""),
      document_id: link?.document_id ?? null,
      file_name: link?.file_name ?? null,
      file_size: link?.file_size ?? null,
      uploaded_at: link?.uploaded_at ?? null,
    } satisfies DocumentRequestItem;
  });
}

/** Flip a document request to uploaded / back to pending. */
export async function setDocumentRequestStatus(
  documentRequestId: string,
  uploaded: boolean,
): Promise<void> {
  const supabase = await admin();
  await supabase
    .from("document_requests")
    .update({ uploaded_status: uploaded ? "uploaded" : "pending" })
    .eq("id", documentRequestId);
}

/** The travel request a document request belongs to (for ownership checks). */
export async function documentRequestOwnerRequestId(
  documentRequestId: string,
): Promise<string | null> {
  const supabase = await admin();
  const { data } = await supabase
    .from("document_requests")
    .select("request_id")
    .eq("id", documentRequestId)
    .maybeSingle();
  return data ? String(data["request_id"]) : null;
}
