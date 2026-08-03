/**
 * Server-only data access for the Amazingfly Travels admin area.
 *
 * Every export here starts from `requireAdmin()`, which re-verifies the
 * httpOnly session cookie against Supabase Auth and then checks that the user
 * has an active row in `admin_profiles`. Customers can never reach this data:
 * the role is read from the database, never from the browser.
 */
import { requireUser, type SessionUser } from "./auth.server";
import { REQUEST_STATUSES, type RequestStatus } from "./request-status";

const BUCKET = "request-documents";

export type AdminRole = "super_admin" | "travel_agent" | "support_staff";

export type AdminProfile = {
  id: string;
  user_id: string;
  full_name: string;
  role: AdminRole;
  permissions: Record<string, unknown>;
  created_at: string;
};

export type AdminAction =
  | "view"
  | "update_status"
  | "assign_staff"
  | "set_priority"
  | "request_document"
  | "review_document"
  | "write_note"
  | "manage_customers"
  | "message_customer"
  | "manage_services"
  | "manage_content"
  | "manage_payments";

const ALL_ACTIONS: AdminAction[] = [
  "view",
  "update_status",
  "assign_staff",
  "set_priority",
  "request_document",
  "review_document",
  "write_note",
  "manage_customers",
  "message_customer",
  "manage_services",
  "manage_content",
  "manage_payments",
];

const ROLE_ACTIONS: Record<AdminRole, AdminAction[]> = {
  super_admin: ALL_ACTIONS,
  travel_agent: [
    "view",
    "update_status",
    "set_priority",
    "request_document",
    "review_document",
    "write_note",
    "manage_customers",
    "message_customer",
    "manage_services",
    "manage_payments",
  ],
  support_staff: [
    "view",
    "request_document",
    "write_note",
    "manage_customers",
    "message_customer",
  ],
};

export function can(admin: AdminProfile, action: AdminAction): boolean {
  const overrides = admin.permissions as Record<string, unknown>;
  if (typeof overrides[action] === "boolean") return overrides[action] as boolean;
  return ROLE_ACTIONS[admin.role]?.includes(action) ?? false;
}

export function allowedActions(admin: AdminProfile): AdminAction[] {
  return ALL_ACTIONS.filter((action) => can(admin, action));
}

/** Writes an entry to the admin audit trail. Never throws. */
export async function logAdminAction(
  who: { user: SessionUser; admin: AdminProfile },
  action: string,
  entity: { type: string; id?: string | null; detail?: string },
): Promise<void> {
  try {
    const supabase = await admin();
    await supabase.from("admin_activity_log").insert({
      admin_id: who.admin.id,
      admin_name: who.admin.full_name || who.user.email,
      action,
      entity_type: entity.type,
      entity_id: entity.id ?? null,
      detail: entity.detail ?? null,
    });
  } catch (error) {
    console.error("[admin] audit log failed", error);
  }
}


async function admin() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

function shapeAdminProfile(row: Record<string, unknown>): AdminProfile {
  return {
    id: String(row["id"]),
    user_id: String(row["user_id"]),
    full_name: String(row["full_name"] ?? ""),
    role: (row["role"] as AdminRole) ?? "support_staff",
    permissions:
      row["permissions"] && typeof row["permissions"] === "object"
        ? (row["permissions"] as Record<string, unknown>)
        : {},
    created_at: String(row["created_at"] ?? ""),
  };
}

/** Returns the admin profile for the signed-in user, or null when not staff. */
export async function getAdminProfile(): Promise<{
  user: SessionUser;
  admin: AdminProfile;
} | null> {
  const { getAuthenticatedUser } = await import("./auth.server");
  const session = await getAuthenticatedUser();
  if (!session) return null;

  const supabase = await admin();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, user_id, full_name, role, permissions, is_active, created_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin] profile lookup failed", error.message);
    return null;
  }
  if (!data || data["is_active"] === false) return null;
  return { user: session.user, admin: shapeAdminProfile(data as Record<string, unknown>) };
}

export async function requireAdmin(action: AdminAction = "view") {
  await requireUser();
  const found = await getAdminProfile();
  if (!found) throw new Error("You do not have access to the admin area.");
  if (!can(found.admin, action)) {
    throw new Error("Your admin role does not allow this action.");
  }
  return found;
}

// ---------------------------------------------------------------- overview

export type AdminStats = {
  total: number;
  newRequests: number;
  documentsRequired: number;
  processing: number;
  completed: number;
  underReview: number;
  cancelled: number;
};

export type AdminRequestRow = {
  id: string;
  request_reference: string;
  full_name: string;
  email: string;
  phone: string;
  service_type: string;
  service_category: string;
  origin_country: string;
  destination_country: string;
  created_at: string;
  request_status: string;
  priority: string;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  airline: string | null;
  flight_number: string | null;
  flight_price: number | null;
  flight_currency: string | null;
  hotel_name: string | null;
  hotel_location: string | null;
  hotel_check_in: string | null;
  hotel_check_out: string | null;
  hotel_price: number | null;
  hotel_currency: string | null;
  payment_status: string;
  booking_status: string;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_reference: string | null;

};


function str(row: Record<string, unknown>, key: string, fallback = ""): string {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
}

async function staffDirectory(): Promise<Map<string, string>> {
  const supabase = await admin();
  const { data } = await supabase.from("admin_profiles").select("id, full_name, role");
  const map = new Map<string, string>();
  (data ?? []).forEach((row) => {
    map.set(String(row["id"]), String(row["full_name"] ?? "Staff"));
  });
  return map;
}

export async function listStaff(): Promise<
  { id: string; full_name: string; role: AdminRole }[]
> {
  const supabase = await admin();
  const { data } = await supabase
    .from("admin_profiles")
    .select("id, full_name, role, is_active")
    .order("full_name", { ascending: true });
  return (data ?? [])
    .filter((row) => row["is_active"] !== false)
    .map((row) => ({
      id: String(row["id"]),
      full_name: String(row["full_name"] ?? "Staff"),
      role: (row["role"] as AdminRole) ?? "support_staff",
    }));
}

function shapeRequestRow(
  row: Record<string, unknown>,
  staff: Map<string, string>,
): AdminRequestRow {
  const assigned = row["assigned_staff_id"] ? String(row["assigned_staff_id"]) : null;
  return {
    id: str(row, "id"),
    request_reference: str(row, "request_reference"),
    full_name: str(row, "full_name", "—"),
    email: str(row, "email"),
    phone: str(row, "phone"),
    service_type: str(row, "service_type"),
    service_category: str(row, "service_category"),
    origin_country: str(row, "origin_country"),
    destination_country: str(row, "destination_country"),
    created_at: str(row, "created_at"),
    request_status: str(row, "request_status", "new_request"),
    priority: str(row, "priority", "normal"),
    assigned_staff_id: assigned,
    assigned_staff_name: assigned ? (staff.get(assigned) ?? null) : null,
    airline: row["airline"] ? String(row["airline"]) : null,
    flight_number: row["flight_number"] ? String(row["flight_number"]) : null,
    flight_price:
      row["flight_price"] === null || row["flight_price"] === undefined
        ? null
        : Number(row["flight_price"]),
    flight_currency: row["flight_currency"] ? String(row["flight_currency"]) : null,
    hotel_name: row["hotel_name"] ? String(row["hotel_name"]) : null,
    hotel_location: row["hotel_location"] ? String(row["hotel_location"]) : null,
    hotel_check_in: row["hotel_check_in"] ? String(row["hotel_check_in"]) : null,
    hotel_check_out: row["hotel_check_out"] ? String(row["hotel_check_out"]) : null,
    hotel_price:
      row["hotel_price"] === null || row["hotel_price"] === undefined
        ? null
        : Number(row["hotel_price"]),
    hotel_currency: row["hotel_currency"] ? String(row["hotel_currency"]) : null,
    payment_status: str(row, "payment_status", "pending_payment"),
    booking_status: str(row, "booking_status", "pending"),

    payment_amount:
      row["agreed_fee"] === null || row["agreed_fee"] === undefined
        ? null
        : Number(row["agreed_fee"]),
    payment_currency: row["currency"] ? String(row["currency"]) : "NGN",
    payment_reference: null,
  };

}

export async function loadAdminRequests(filters: {
  status?: string | undefined;
  search?: string | undefined;
}): Promise<{ rows: AdminRequestRow[]; stats: AdminStats }> {
  const supabase = await admin();
  const staff = await staffDirectory();

  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[admin] requests", error.message);
    return {
      rows: [],
      stats: {
        total: 0,
        newRequests: 0,
        documentsRequired: 0,
        processing: 0,
        completed: 0,
        underReview: 0,
        cancelled: 0,
      },
    };
  }

  const { latestTransactionByRequest } = await import("./payment/transactions.server");
  const payments = await latestTransactionByRequest();

  const all = (data ?? []).map((row) => {
    const shaped = shapeRequestRow(row as Record<string, unknown>, staff);
    const payment = payments.get(shaped.id);
    if (payment) {
      shaped.payment_reference = payment.transaction_reference;
      shaped.payment_currency = payment.currency;
      if (payment.amount) shaped.payment_amount = payment.amount;
    }
    return shaped;
  });
  const count = (status: string) => all.filter((row) => row.request_status === status).length;

  const stats: AdminStats = {
    total: all.length,
    newRequests: count("new_request") + count("received"),
    documentsRequired: count("documents_required"),
    processing: count("processing") + count("approved"),
    completed: count("completed"),
    underReview: count("under_review"),
    cancelled: count("cancelled"),
  };

  let rows = all;
  if (filters.status && filters.status !== "all") {
    rows = rows.filter((row) => row.request_status === filters.status);
  }
  const term = filters.search?.trim().toLowerCase();
  if (term) {
    rows = rows.filter((row) =>
      [
        row.request_reference,
        row.full_name,
        row.email,
        row.service_type,
        row.destination_country,
        row.airline ?? "",
        row.hotel_name ?? "",

      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }

  return { rows, stats };
}

// ---------------------------------------------------------------- detail

export type AdminDocument = {
  id: string;
  document_type: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
  review_status: string;
  review_note: string | null;
  document_request_id: string | null;
};

export type AdminDocumentRequest = {
  id: string;
  document_name: string;
  description: string | null;
  required_status: string;
  uploaded_status: string;
  created_at: string;
};

export type AdminNote = {
  id: string;
  note: string;
  author: string;
  created_at: string;
};

export type AdminActivity = {
  id: string;
  status: string | null;
  message: string | null;
  author: string | null;
  created_at: string;
};

export type AdminRequestDetail = {
  request: AdminRequestRow & {
    nationality: string;
    country_of_residence: string;
    travel_date: string;
    return_date: string;
    travel_purpose: string;
    preferred_contact: string;
    request_details: string;
    answers: { label: string; value: string }[];
  };
  documents: AdminDocument[];
  documentRequests: AdminDocumentRequest[];
  notes: AdminNote[];
  activity: AdminActivity[];
  staff: { id: string; full_name: string; role: AdminRole }[];
};

function readAnswers(row: Record<string, unknown>): { label: string; value: string }[] {
  const raw = row["answers"];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      const label = String(item["label"] ?? item["id"] ?? "");
      const value = item["value"];
      const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
      return { label, value: text };
    })
    .filter((entry) => entry.label && entry.value);
}

export async function loadAdminRequestDetail(
  requestId: string,
): Promise<AdminRequestDetail | null> {
  const supabase = await admin();
  const staffMap = await staffDirectory();

  const { data: row, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !row) return null;
  const record = row as Record<string, unknown>;

  const [docsRes, docReqRes, notesRes, activityRes, staff] = await Promise.all([
    supabase
      .from("uploaded_documents")
      .select("*")
      .eq("request_id", requestId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("document_requests")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
    supabase
      .from("internal_notes")
      .select("id, note, admin_id, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
    supabase
      .from("request_updates")
      .select("id, status, message, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false }),
    listStaff(),
  ]);

  const documents: AdminDocument[] = (docsRes.data ?? []).map((d) => {
    const doc = d as Record<string, unknown>;
    return {
      id: str(doc, "id"),
      document_type: str(doc, "document_type", "Document"),
      file_name: str(doc, "file_name", "document"),
      file_size: doc["file_size"] === null ? null : Number(doc["file_size"] ?? 0),
      uploaded_at: str(doc, "uploaded_at"),
      review_status: str(doc, "review_status", "pending"),
      review_note: (doc["review_note"] as string | null) ?? null,
      document_request_id: (doc["document_request_id"] as string | null) ?? null,
    };
  });

  const documentRequests: AdminDocumentRequest[] = (docReqRes.data ?? []).map((d) => {
    const item = d as Record<string, unknown>;
    return {
      id: str(item, "id"),
      document_name: str(item, "document_name"),
      description: (item["description"] as string | null) ?? null,
      required_status: str(item, "required_status", "required"),
      uploaded_status: str(item, "uploaded_status", "pending"),
      created_at: str(item, "created_at"),
    };
  });

  const notes: AdminNote[] = (notesRes.data ?? []).map((n) => {
    const note = n as Record<string, unknown>;
    const authorId = note["admin_id"] ? String(note["admin_id"]) : null;
    return {
      id: str(note, "id"),
      note: str(note, "note"),
      author: (authorId ? staffMap.get(authorId) : null) ?? "Amazingfly staff",
      created_at: str(note, "created_at"),
    };
  });

  const activity: AdminActivity[] = (activityRes.data ?? []).map((a) => {
    const item = a as Record<string, unknown>;
    return {
      id: str(item, "id"),
      status: (item["status"] as string | null) ?? null,
      message: (item["message"] as string | null) ?? null,
      author: null,
      created_at: str(item, "created_at"),
    };
  });

  return {
    request: {
      ...shapeRequestRow(record, staffMap),
      nationality: str(record, "nationality"),
      country_of_residence: str(record, "country_of_residence"),
      travel_date: str(record, "travel_date"),
      return_date: str(record, "return_date"),
      travel_purpose: str(record, "travel_purpose"),
      preferred_contact: str(record, "preferred_contact"),
      request_details: str(record, "request_details"),
      answers: readAnswers(record),
    },
    documents,
    documentRequests,
    notes,
    activity,
    staff,
  };
}

// ---------------------------------------------------------------- mutations

export async function changeRequestStatus(
  who: { user: SessionUser; admin: AdminProfile },
  requestId: string,
  status: string,
  message: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!REQUEST_STATUSES.includes(status as RequestStatus)) {
    return { ok: false, message: "That status is not part of the workflow." };
  }
  const supabase = await admin();

  // Log the activity first so the database trigger does not duplicate it.
  const logged = await supabase.from("request_updates").insert({
    request_id: requestId,
    status,
    message: message.trim() || `Status updated to ${status} by ${who.admin.full_name}`,
    created_by: who.user.id,
  });
  if (logged.error) {
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status,
      message: message.trim() || `Status updated to ${status}`,
    });
  }

  const { error } = await supabase
    .from("service_requests")
    .update({ request_status: status })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message };

  const { notifyStatusChanged } = await import("./notifications.server");
  await notifyStatusChanged(requestId, status, message.trim() || undefined);
  return { ok: true };
}

export async function assignStaff(
  requestId: string,
  staffId: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await admin();
  const { error } = await supabase
    .from("service_requests")
    .update({ assigned_staff_id: staffId })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setPriority(
  requestId: string,
  priority: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await admin();
  const { error } = await supabase
    .from("service_requests")
    .update({ priority })
    .eq("id", requestId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function addInternalNote(
  who: { admin: AdminProfile },
  requestId: string,
  note: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await admin();
  const { error } = await supabase
    .from("internal_notes")
    .insert({ request_id: requestId, admin_id: who.admin.id, note });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function createDocumentRequest(
  requestId: string,
  documentName: string,
  description: string,
  requiredStatus: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await admin();
  const { error } = await supabase.from("document_requests").insert({
    request_id: requestId,
    document_name: documentName,
    description: description || null,
    required_status: requiredStatus,
  });
  if (error) return { ok: false, message: error.message };

  const { notifyDocumentRequested } = await import("./notifications.server");
  await notifyDocumentRequested({
    requestId,
    documentName,
    description,
    requiredStatus,
  });
  return { ok: true };
}

export async function reviewDocument(
  documentId: string,
  reviewStatus: "approved" | "rejected",
  reviewNote: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("uploaded_documents")
    .update({ review_status: reviewStatus, review_note: reviewNote || null })
    .eq("id", documentId)
    .select("id, document_request_id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };

  const linked = (data as Record<string, unknown> | null)?.["document_request_id"];
  if (linked) {
    await supabase
      .from("document_requests")
      .update({ uploaded_status: reviewStatus })
      .eq("id", String(linked));
  }
  return { ok: true };
}

export async function signAdminDocumentDownload(
  documentId: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("uploaded_documents")
    .select("file_url")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Document not found." };

  const signed = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(String((data as Record<string, unknown>)["file_url"]), 60 * 10);
  if (signed.error || !signed.data) {
    return { ok: false, message: signed.error?.message ?? "Could not open the file." };
  }
  return { ok: true, url: signed.data.signedUrl };
}
