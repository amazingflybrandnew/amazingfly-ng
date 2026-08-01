/**
 * Server-only data access for the customer account area.
 *
 * Ownership is always derived from the verified session (never from the
 * request payload). Requests are matched to the account by user_id when that
 * column exists, and by the email the request was submitted with, so requests
 * placed before the customer created an account still appear in the dashboard.
 */
import type { SessionUser } from "./auth.server";
import type {
  AccountDocument,
  AccountNotification,
  AccountRequest,
  DashboardData,
  RequestUpdate,
} from "./account.functions";

const BUCKET = "request-documents";

const REQUEST_COLUMNS =
  "id, request_reference, service_type, origin_country, destination_country, travel_date, return_date, request_status, created_at, full_name, email, phone, preferred_contact, request_details";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

async function admin() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

type RawRequest = Record<string, unknown>;

function shape(row: RawRequest, documentCount: number): AccountRequest {
  const get = (key: string) => (row[key] === undefined ? null : (row[key] as string | null));
  return {
    id: String(row["id"]),
    request_reference: String(row["request_reference"] ?? ""),
    service_type: get("service_type"),
    service_category: get("service_category"),
    origin_country: get("origin_country"),
    destination_country: get("destination_country"),
    travel_date: get("travel_date"),
    return_date: get("return_date"),
    request_status: String(row["request_status"] ?? "new_request"),
    created_at: String(row["created_at"] ?? ""),
    full_name: get("full_name"),
    email: get("email"),
    phone: get("phone"),
    preferred_contact: get("preferred_contact"),
    request_details: get("request_details"),
    document_count: documentCount,
  };
}

/** All requests belonging to the signed-in customer. */
async function fetchOwnedRequests(user: SessionUser): Promise<RawRequest[]> {
  const supabase = await admin();
  const email = user.email.toLowerCase();

  // Preferred path: user_id column (added by the Stage 4 migration).
  const withUserId = await supabase
    .from("service_requests")
    .select(`${REQUEST_COLUMNS}, service_category, user_id`)
    .or(`user_id.eq.${user.id},email.ilike.${email}`)
    .order("created_at", { ascending: false });

  if (!withUserId.error) {
    // Claim any older requests submitted with the same email.
    const unclaimed = (withUserId.data ?? []).filter((row) => !row["user_id"]);
    if (unclaimed.length) {
      await supabase
        .from("service_requests")
        .update({ user_id: user.id })
        .in(
          "id",
          unclaimed.map((row) => row["id"] as string),
        );
    }
    return withUserId.data ?? [];
  }

  // Fallback while the migration has not been run yet.
  const byEmail = await supabase
    .from("service_requests")
    .select(REQUEST_COLUMNS)
    .ilike("email", email)
    .order("created_at", { ascending: false });
  if (byEmail.error) {
    console.error("[account] requests", byEmail.error.message);
    return [];
  }
  return byEmail.data ?? [];
}

async function fetchDocuments(
  requestIds: string[],
  referenceById: Map<string, string>,
): Promise<AccountDocument[]> {
  if (!requestIds.length) return [];
  const supabase = await admin();
  const { data, error } = await supabase
    .from("uploaded_documents")
    .select("id, request_id, document_type, file_name, file_size, uploaded_at")
    .in("request_id", requestIds)
    .order("uploaded_at", { ascending: false });
  if (error) {
    console.error("[account] documents", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: String(row["id"]),
    request_id: String(row["request_id"]),
    request_reference: referenceById.get(String(row["request_id"])) ?? "",
    document_type: String(row["document_type"] ?? "Document"),
    file_name: (row["file_name"] as string | null) ?? null,
    file_size: (row["file_size"] as number | null) ?? null,
    uploaded_at: String(row["uploaded_at"] ?? ""),
  }));
}

async function fetchNotifications(user: SessionUser): Promise<AccountNotification[]> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, read_status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: String(row["id"]),
    title: String(row["title"] ?? ""),
    message: String(row["message"] ?? ""),
    read_status: Boolean(row["read_status"]),
    created_at: String(row["created_at"] ?? ""),
  }));
}

export async function loadAccountData(user: SessionUser): Promise<DashboardData> {
  const rows = await fetchOwnedRequests(user);
  const ids = rows.map((row) => String(row["id"]));
  const referenceById = new Map(
    rows.map((row) => [String(row["id"]), String(row["request_reference"] ?? "")]),
  );

  const [documents, notifications] = await Promise.all([
    fetchDocuments(ids, referenceById),
    fetchNotifications(user),
  ]);

  const countByRequest = new Map<string, number>();
  documents.forEach((doc) => {
    countByRequest.set(doc.request_id, (countByRequest.get(doc.request_id) ?? 0) + 1);
  });

  const requests = rows.map((row) => shape(row, countByRequest.get(String(row["id"])) ?? 0));
  const closed = ["completed", "cancelled"];

  return {
    requests,
    documents,
    notifications,
    totals: {
      total: requests.length,
      active: requests.filter((r) => !closed.includes(r.request_status)).length,
      completed: requests.filter((r) => r.request_status === "completed").length,
      documentsRequired: requests.filter((r) => r.request_status === "documents_required").length,
      unreadNotifications: notifications.filter((n) => !n.read_status).length,
    },
  };
}

async function ownedRequestRow(user: SessionUser, requestId: string): Promise<RawRequest | null> {
  const rows = await fetchOwnedRequests(user);
  return rows.find((row) => String(row["id"]) === requestId) ?? null;
}

export async function loadRequestDetail(
  user: SessionUser,
  requestId: string,
): Promise<{
  request: AccountRequest;
  documents: AccountDocument[];
  updates: RequestUpdate[];
} | null> {
  const row = await ownedRequestRow(user, requestId);
  if (!row) return null;

  const reference = String(row["request_reference"] ?? "");
  const documents = await fetchDocuments([requestId], new Map([[requestId, reference]]));

  const supabase = await admin();
  const { data: updateRows } = await supabase
    .from("request_updates")
    .select("id, status, message, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  const updates: RequestUpdate[] = (updateRows ?? []).map((u) => ({
    id: String(u["id"]),
    status: (u["status"] as string | null) ?? null,
    message: (u["message"] as string | null) ?? null,
    created_at: String(u["created_at"] ?? ""),
  }));

  return { request: shape(row, documents.length), documents, updates };
}

export async function signUploadForOwnedRequest(
  user: SessionUser,
  input: { request_id: string; document_type: string; file_name: string; file_size: number },
): Promise<{ ok: true; path: string; uploadUrl: string } | { ok: false; message: string }> {
  const row = await ownedRequestRow(user, input.request_id);
  if (!row) return { ok: false, message: "Request not found." };

  const supabase = await admin();
  const path = `${String(row["request_reference"])}/${input.document_type}/${Date.now()}-${safeName(
    input.file_name,
  )}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not prepare the upload." };
  }
  const base = process.env["EXTERNAL_SUPABASE_URL"]!;
  const uploadUrl = data.signedUrl.startsWith("http")
    ? data.signedUrl
    : `${base}/storage/v1${data.signedUrl}`;
  return { ok: true, path, uploadUrl };
}

export async function saveOwnedDocument(
  user: SessionUser,
  input: {
    request_id: string;
    document_type: string;
    file_url: string;
    file_name: string;
    file_size: number;
  },
): Promise<{ ok: boolean; message?: string }> {
  const row = await ownedRequestRow(user, input.request_id);
  if (!row) return { ok: false, message: "Request not found." };

  const supabase = await admin();
  const { error } = await supabase.from("uploaded_documents").insert({
    request_id: input.request_id,
    document_type: input.document_type,
    file_url: input.file_url,
    file_name: input.file_name,
    file_size: input.file_size,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function ownedDocument(user: SessionUser, documentId: string) {
  const supabase = await admin();
  const { data } = await supabase
    .from("uploaded_documents")
    .select("id, request_id, file_url")
    .eq("id", documentId)
    .maybeSingle();
  if (!data) return null;
  const row = await ownedRequestRow(user, String(data["request_id"]));
  if (!row) return null;
  return data;
}

export async function removeOwnedDocument(
  user: SessionUser,
  documentId: string,
): Promise<{ ok: boolean; message?: string }> {
  const doc = await ownedDocument(user, documentId);
  if (!doc) return { ok: false, message: "Document not found." };

  const supabase = await admin();
  await supabase.storage.from(BUCKET).remove([String(doc["file_url"])]);
  const { error } = await supabase.from("uploaded_documents").delete().eq("id", documentId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function signOwnedDocumentDownload(
  user: SessionUser,
  documentId: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const doc = await ownedDocument(user, documentId);
  if (!doc) return { ok: false, message: "Document not found." };

  const supabase = await admin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(String(doc["file_url"]), 60 * 10);
  if (error || !data) return { ok: false, message: error?.message ?? "Could not open the file." };
  return { ok: true, url: data.signedUrl };
}

export async function markRead(user: SessionUser, id: string | null): Promise<{ ok: boolean }> {
  const supabase = await admin();
  let query = supabase.from("notifications").update({ read_status: true }).eq("user_id", user.id);
  if (id) query = query.eq("id", id);
  const { error } = await query;
  return { ok: !error };
}
