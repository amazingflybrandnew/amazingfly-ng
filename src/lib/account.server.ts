/**
 * Server-only data access for the customer account area.
 *
 * Ownership is always derived from the verified session (never from the
 * request payload). Requests are matched to the account by user_id when that
 * column exists, and by the email the request was submitted with, so requests
 * placed before the customer created an account still appear in the dashboard.
 */
import type { SessionUser } from "./auth.server";
import { normalizePaymentStatus } from "./payment-status";
import type {
  AccountDocument,
  AccountNotification,
  AccountRequest,
  DashboardData,
  DocumentRequestItem,
  RequestUpdate,
} from "./account.functions";

const BUCKET = "request-documents";

const REQUEST_COLUMNS =
  "id, request_reference, service_type, origin_country, destination_country, travel_date, return_date, request_status, created_at, full_name, email, phone, preferred_contact, request_details, payment_status, agreed_fee";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

async function admin() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

type RawRequest = Record<string, unknown>;

function num(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

type TxSummary = {
  amount: number | null;
  currency: string | null;
  reference: string | null;
  status: string | null;
};

/** Latest payment transaction per request, for dashboard payment columns. */
async function fetchTransactionSummaries(
  requestIds: string[],
): Promise<Map<string, TxSummary>> {
  const map = new Map<string, TxSummary>();
  if (!requestIds.length) return map;
  const supabase = await admin();
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("request_id, amount, currency, transaction_reference, status, created_at")
    .in("request_id", requestIds)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[account] transactions", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const id = String(row["request_id"] ?? "");
    if (!id) continue;
    const status = String(row["status"] ?? "pending");
    const existing = map.get(id);
    // Prefer a successful payment, otherwise keep the most recent attempt.
    if (existing && existing.status === "successful") continue;
    if (existing && status !== "successful") continue;
    map.set(id, {
      amount: row["amount"] === null || row["amount"] === undefined ? null : Number(row["amount"]),
      currency: (row["currency"] as string | null) ?? null,
      reference: (row["transaction_reference"] as string | null) ?? null,
      status,
    });
  }
  return map;
}

function shape(row: RawRequest, documentCount: number, tx?: TxSummary): AccountRequest {
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
    payment_status: normalizePaymentStatus(row["payment_status"]),
    agreed_fee:
      row["agreed_fee"] === null || row["agreed_fee"] === undefined
        ? null
        : Number(row["agreed_fee"]),
    amount: num(row["amount"]) ?? num(row["quoted_amount"]),
    currency: get("currency") ?? "NGN",
    catalogue_id: get("catalogue_id"),
    requires_quote: row["requires_quote"] === true,
    document_count: documentCount,
    paid_amount: tx?.amount ?? null,
    paid_currency: tx?.currency ?? null,
    transaction_reference: tx?.reference ?? null,
    transaction_status: tx?.status ?? null,
    quote_notes: get("quote_notes"),
    airline: get("airline"),
    airline_logo_url: get("airline_logo_url"),
    flight_number: get("flight_number"),
    flight_origin: get("flight_origin"),
    flight_destination: get("flight_destination"),
    flight_departure_at: get("flight_departure_at"),
    flight_arrival_at: get("flight_arrival_at"),
    flight_duration: get("flight_duration"),
    flight_stops: num(row["flight_stops"]),
    cabin_class: get("cabin_class"),
    passenger_count: num(row["passenger_count"]),
    flight_price: num(row["flight_price"]),
    flight_currency: get("flight_currency"),
    flight_offer_id: get("flight_offer_id"),
    booking_status: get("booking_status"),
    hotel_provider_id: get("hotel_provider_id"),
    hotel_name: get("hotel_name"),
    hotel_image_url: get("hotel_image_url"),
    hotel_rating: num(row["hotel_rating"]),
    hotel_location: get("hotel_location"),
    hotel_address: get("hotel_address"),
    hotel_check_in: get("hotel_check_in"),
    hotel_check_out: get("hotel_check_out"),
    hotel_nights: num(row["hotel_nights"]),
    hotel_guests: num(row["hotel_guests"]),
    hotel_rooms: num(row["hotel_rooms"]),
    hotel_room_type: get("hotel_room_type"),
    hotel_board_type: get("hotel_board_type"),
    hotel_cancellation_policy: get("hotel_cancellation_policy"),
    hotel_price: num(row["hotel_price"]),
    hotel_currency: get("hotel_currency"),

  };
}

/** All requests belonging to the signed-in customer. */
async function fetchOwnedRequests(user: SessionUser): Promise<RawRequest[]> {
  const supabase = await admin();
  const email = user.email.toLowerCase();

  // Preferred path: user_id column (added by the Stage 4 migration).
  const withUserId = await supabase
    .from("service_requests")
    .select("*")
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
  const FULL =
    "id, request_id, document_type, file_name, file_size, uploaded_at, review_status, review_note, reviewed_at";
  let { data, error } = await supabase
    .from("uploaded_documents")
    .select(FULL)
    .in("request_id", requestIds)
    .order("uploaded_at", { ascending: false });

  if (error) {
    // Fallback while the document-verification migration has not been run.
    const legacy = await supabase
      .from("uploaded_documents")
      .select("id, request_id, document_type, file_name, file_size, uploaded_at")
      .in("request_id", requestIds)
      .order("uploaded_at", { ascending: false });
    data = legacy.data as typeof data;
    error = legacy.error;
  }
  if (error) {
    console.error("[account] documents", error.message);
    return [];
  }
  return (data ?? []).map((entry) => {
    const row = entry as Record<string, unknown>;
    return {
      id: String(row["id"]),
      request_id: String(row["request_id"]),
      request_reference: referenceById.get(String(row["request_id"])) ?? "",
      document_type: String(row["document_type"] ?? "Document"),
      file_name: (row["file_name"] as string | null) ?? null,
      file_size: (row["file_size"] as number | null) ?? null,
      uploaded_at: String(row["uploaded_at"] ?? ""),
      review_status: String(row["review_status"] ?? "pending"),
      review_note: (row["review_note"] as string | null) ?? null,
      reviewed_at: (row["reviewed_at"] as string | null) ?? null,
    };
  });
}

async function fetchNotifications(user: SessionUser): Promise<AccountNotification[]> {
  const supabase = await admin();
  const withRequest = await supabase
    .from("notifications")
    .select("id, title, message, read_status, created_at, request_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  let rows = (withRequest.data ?? null) as RawRequest[] | null;
  if (withRequest.error) {
    // The request_id column is added by the document-request migration.
    const legacy = await supabase
      .from("notifications")
      .select("id, title, message, read_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (legacy.error) return [];
    rows = legacy.data;
  }

  return (rows ?? []).map((row) => ({
    id: String(row["id"]),
    title: String(row["title"] ?? ""),
    message: String(row["message"] ?? ""),
    read_status: Boolean(row["read_status"]),
    created_at: String(row["created_at"] ?? ""),
    request_id: (row["request_id"] as string | null | undefined) ?? null,
  }));
}

export async function loadAccountData(user: SessionUser): Promise<DashboardData> {
  const rows = await fetchOwnedRequests(user);
  const ids = rows.map((row) => String(row["id"]));
  const referenceById = new Map(
    rows.map((row) => [String(row["id"]), String(row["request_reference"] ?? "")]),
  );

  const { fetchDocumentRequests } = await import("./document-requests.server");
  const [documents, documentRequests, notifications] = await Promise.all([
    fetchDocuments(ids, referenceById),
    fetchDocumentRequests(ids, referenceById),
    fetchNotifications(user),
  ]);

  const countByRequest = new Map<string, number>();
  documents.forEach((doc) => {
    countByRequest.set(doc.request_id, (countByRequest.get(doc.request_id) ?? 0) + 1);
  });

  const transactions = await fetchTransactionSummaries(ids);
  const requests = rows.map((row) =>
    shape(
      row,
      countByRequest.get(String(row["id"])) ?? 0,
      transactions.get(String(row["id"])),
    ),
  );
  const closed = ["completed", "cancelled"];
  const outstanding = documentRequests.filter(
    (item) => item.uploaded_status === "pending" || item.uploaded_status === "rejected",
  ).length;

  return {
    requests,
    documents,
    documentRequests,
    notifications,
    totals: {
      total: requests.length,
      active: requests.filter((r) => !closed.includes(r.request_status)).length,
      completed: requests.filter((r) => r.request_status === "completed").length,
      documentsRequired:
        outstanding ||
        requests.filter((r) => r.request_status === "documents_required").length,
      unreadNotifications: notifications.filter((n) => !n.read_status).length,
    },
  };
}


async function ownedRequestRow(user: SessionUser, requestId: string): Promise<RawRequest | null> {
  // Direct lookup first: a request submitted moments ago through the public
  // wizard may not be owned yet (user_id null) — it is claimed here when the
  // submission email matches the signed-in account.
  const supabase = await admin();
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (!error && data) {
    const row = data as RawRequest;
    const owner = row["user_id"] ? String(row["user_id"]) : null;
    const rowEmail = String(row["email"] ?? "").toLowerCase();
    if (owner && owner === user.id) return row;
    if (!owner && rowEmail && rowEmail === user.email.toLowerCase()) {
      await supabase
        .from("service_requests")
        .update({ user_id: user.id })
        .eq("id", requestId)
        .is("user_id", null);
      await supabase
        .from("payment_transactions")
        .update({ user_id: user.id })
        .eq("request_id", requestId)
        .is("user_id", null);
      return { ...row, user_id: user.id } as RawRequest;
    }
    if (owner) return null;
  }

  const rows = await fetchOwnedRequests(user);
  return rows.find((r) => String(r["id"]) === requestId) ?? null;
}


export async function loadRequestDetail(
  user: SessionUser,
  requestId: string,
): Promise<{
  request: AccountRequest;
  documents: AccountDocument[];
  documentRequests: DocumentRequestItem[];
  updates: RequestUpdate[];
} | null> {
  const row = await ownedRequestRow(user, requestId);
  if (!row) return null;

  const reference = String(row["request_reference"] ?? "");
  const referenceById = new Map([[requestId, reference]]);
  const { fetchDocumentRequests } = await import("./document-requests.server");
  const [documents, documentRequests] = await Promise.all([
    fetchDocuments([requestId], referenceById),
    fetchDocumentRequests([requestId], referenceById),
  ]);

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

  const transactions = await fetchTransactionSummaries([requestId]);
  return {
    request: shape(row, documents.length, transactions.get(requestId)),
    documents,
    documentRequests,
    updates,
  };
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
    document_request_id?: string | null | undefined;
  },
): Promise<{ ok: boolean; message?: string }> {
  const row = await ownedRequestRow(user, input.request_id);
  if (!row) return { ok: false, message: "Request not found." };

  const supabase = await admin();
  const base = {
    request_id: input.request_id,
    document_type: input.document_type,
    file_url: input.file_url,
    file_name: input.file_name,
    file_size: input.file_size,
  };

  if (input.document_request_id) {
    const { documentRequestOwnerRequestId, setDocumentRequestStatus } = await import(
      "./document-requests.server"
    );
    const owner = await documentRequestOwnerRequestId(input.document_request_id);
    if (owner !== input.request_id) {
      return { ok: false, message: "That document request does not belong to this request." };
    }
    const linked = await supabase
      .from("uploaded_documents")
      .insert({ ...base, document_request_id: input.document_request_id });
    if (!linked.error) {
      await setDocumentRequestStatus(input.document_request_id, true);
      return { ok: true };
    }
  }

  const { error } = await supabase.from("uploaded_documents").insert(base);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function ownedDocument(user: SessionUser, documentId: string) {
  const supabase = await admin();
  const primary = await supabase
    .from("uploaded_documents")
    .select("id, request_id, file_url, document_request_id")
    .eq("id", documentId)
    .maybeSingle();
  let data = primary.data as Record<string, unknown> | null;
  if (primary.error) {
    const legacy = await supabase
      .from("uploaded_documents")
      .select("id, request_id, file_url")
      .eq("id", documentId)
      .maybeSingle();
    data = (legacy.data as Record<string, unknown> | null) ?? null;
  }
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

  const linkedRequest = (doc as Record<string, unknown>)["document_request_id"] as
    | string
    | null
    | undefined;
  if (linkedRequest) {
    const { setDocumentRequestStatus } = await import("./document-requests.server");
    await setDocumentRequestStatus(linkedRequest, false);
  }
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

// ------------------------------------------------------- customer messages

export type ConversationMessage = {
  id: string;
  sender: string;
  author: string;
  body: string;
  created_at: string;
};

/** Messages exchanged with Amazingfly staff on a request the customer owns. */
export async function loadRequestConversation(
  user: SessionUser,
  requestId: string,
): Promise<ConversationMessage[]> {
  const row = await ownedRequestRow(user, requestId);
  if (!row) return [];

  const supabase = await admin();
  const { data, error } = await supabase
    .from("customer_messages")
    .select("id, sender, author_name, body, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) return [];

  await supabase
    .from("customer_messages")
    .update({ read_by_customer: true })
    .eq("request_id", requestId)
    .eq("sender", "admin");

  return (data ?? []).map((entry) => {
    const message = entry as Record<string, unknown>;
    const sender = String(message["sender"] ?? "customer");
    return {
      id: String(message["id"]),
      sender,
      author:
        String(message["author_name"] ?? "") ||
        (sender === "admin" ? "Amazingfly Travels" : "You"),
      body: String(message["body"] ?? ""),
      created_at: String(message["created_at"] ?? ""),
    };
  });
}

export async function sendCustomerReply(
  user: SessionUser,
  requestId: string,
  body: string,
): Promise<{ ok: boolean; message?: string }> {
  const row = await ownedRequestRow(user, requestId);
  if (!row) return { ok: false, message: "Request not found." };

  const supabase = await admin();
  const { error } = await supabase.from("customer_messages").insert({
    request_id: requestId,
    user_id: user.id,
    email: user.email,
    sender: "customer",
    author_name: String(row["full_name"] ?? user.email),
    body,
    read_by_customer: true,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** General support conversation, independent of a specific travel request. */
export async function loadLiveChatConversation(
  user: SessionUser,
): Promise<ConversationMessage[]> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("customer_messages")
    .select("id, sender, author_name, body, created_at")
    .ilike("email", user.email)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) {
    console.error("[account] live chat", error.message);
    return [];
  }

  await supabase
    .from("customer_messages")
    .update({ read_by_customer: true })
    .ilike("email", user.email)
    .eq("sender", "admin");

  return (data ?? []).map((entry) => {
    const message = entry as Record<string, unknown>;
    const sender = String(message["sender"] ?? "customer");
    return {
      id: String(message["id"]),
      sender,
      author:
        String(message["author_name"] ?? "") ||
        (sender === "admin" ? "Amazingfly Travels" : "You"),
      body: String(message["body"] ?? ""),
      created_at: String(message["created_at"] ?? ""),
    };
  });
}

export async function sendLiveChatReply(
  user: SessionUser,
  body: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await admin();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const name =
    String((profile as Record<string, unknown> | null)?.["full_name"] ?? "").trim() ||
    user.email;

  const { error } = await supabase.from("customer_messages").insert({
    request_id: null,
    user_id: user.id,
    email: user.email,
    sender: "customer",
    author_name: name,
    body,
    read_by_customer: true,
    read_by_admin: false,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
