/**
 * Server-only data access for Amazingfly Travels admin Part 2:
 * customers, services, website content, communication and activity tracking.
 *
 * Every export is called from a server function that has already passed
 * `requireAdmin(action)`, so the role check happens on the server, never in
 * the browser.
 */
import type { AdminProfile } from "./admin.server";
import type { SessionUser } from "./auth.server";

export type Who = { user: SessionUser; admin: AdminProfile };

const MEDIA_BUCKET = "site-media";

async function db() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

function str(row: Record<string, unknown>, key: string, fallback = ""): string {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
}

// ------------------------------------------------------------ customers

export type AdminCustomer = {
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  created_at: string;
  request_count: number;
  last_request_at: string | null;
  account_status: "registered" | "guest";
};

export async function loadCustomers(search?: string): Promise<AdminCustomer[]> {
  const supabase = await db();

  const [profilesRes, requestsRes] = await Promise.all([
    supabase.from("profiles").select("*").limit(1000),
    supabase
      .from("service_requests")
      .select("user_id, email, full_name, phone, nationality, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const requests = (requestsRes.data ?? []) as Record<string, unknown>[];
  const byEmail = new Map<string, AdminCustomer>();

  const upsert = (entry: AdminCustomer) => {
    const key = entry.email.toLowerCase();
    if (!key) return;
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, entry);
      return;
    }
    byEmail.set(key, {
      ...existing,
      user_id: existing.user_id ?? entry.user_id,
      full_name: existing.full_name || entry.full_name,
      phone: existing.phone || entry.phone,
      nationality: existing.nationality || entry.nationality,
      created_at:
        existing.created_at && entry.created_at
          ? existing.created_at < entry.created_at
            ? existing.created_at
            : entry.created_at
          : existing.created_at || entry.created_at,
      account_status: existing.account_status === "registered" ? "registered" : entry.account_status,
    });
  };

  for (const raw of (profilesRes.data ?? []) as Record<string, unknown>[]) {
    upsert({
      user_id: raw["user_id"] ? String(raw["user_id"]) : raw["id"] ? String(raw["id"]) : null,
      full_name: str(raw, "full_name"),
      email: str(raw, "email"),
      phone: str(raw, "phone"),
      nationality: str(raw, "nationality"),
      created_at: str(raw, "created_at"),
      request_count: 0,
      last_request_at: null,
      account_status: "registered",
    });
  }

  for (const raw of requests) {
    upsert({
      user_id: raw["user_id"] ? String(raw["user_id"]) : null,
      full_name: str(raw, "full_name"),
      email: str(raw, "email"),
      phone: str(raw, "phone"),
      nationality: str(raw, "nationality"),
      created_at: str(raw, "created_at"),
      request_count: 0,
      last_request_at: null,
      account_status: raw["user_id"] ? "registered" : "guest",
    });
  }

  for (const raw of requests) {
    const key = str(raw, "email").toLowerCase();
    const entry = byEmail.get(key);
    if (!entry) continue;
    entry.request_count += 1;
    const at = str(raw, "created_at");
    if (!entry.last_request_at || at > entry.last_request_at) entry.last_request_at = at;
  }

  let list = [...byEmail.values()];
  const term = search?.trim().toLowerCase();
  if (term) {
    list = list.filter((customer) =>
      [customer.full_name, customer.email, customer.phone].join(" ").toLowerCase().includes(term),
    );
  }
  return list.sort((a, b) => (b.last_request_at ?? "").localeCompare(a.last_request_at ?? ""));
}

export type AdminCustomerDetail = {
  customer: AdminCustomer;
  requests: {
    id: string;
    request_reference: string;
    service_type: string;
    destination_country: string;
    request_status: string;
    created_at: string;
  }[];
  documents: {
    id: string;
    document_type: string;
    file_name: string;
    uploaded_at: string;
    review_status: string;
    request_reference: string;
  }[];
};

export async function loadCustomerDetail(email: string): Promise<AdminCustomerDetail | null> {
  const supabase = await db();
  const all = await loadCustomers();
  const customer = all.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!customer) return null;

  const { data: rows } = await supabase
    .from("service_requests")
    .select("id, request_reference, service_type, service_category, destination_country, request_status, created_at")
    .ilike("email", email)
    .order("created_at", { ascending: false });

  const requests = ((rows ?? []) as Record<string, unknown>[]).map((row) => ({
    id: str(row, "id"),
    request_reference: str(row, "request_reference"),
    service_type: str(row, "service_type") || str(row, "service_category"),
    destination_country: str(row, "destination_country"),
    request_status: str(row, "request_status", "new_request"),
    created_at: str(row, "created_at"),
  }));

  const referenceById = new Map(requests.map((row) => [row.id, row.request_reference]));
  let documents: AdminCustomerDetail["documents"] = [];
  if (requests.length) {
    const { data: docs } = await supabase
      .from("uploaded_documents")
      .select("id, request_id, document_type, file_name, uploaded_at, review_status")
      .in(
        "request_id",
        requests.map((row) => row.id),
      )
      .order("uploaded_at", { ascending: false });
    documents = ((docs ?? []) as Record<string, unknown>[]).map((row) => ({
      id: str(row, "id"),
      document_type: str(row, "document_type", "Document"),
      file_name: str(row, "file_name"),
      uploaded_at: str(row, "uploaded_at"),
      review_status: str(row, "review_status", "pending"),
      request_reference: referenceById.get(str(row, "request_id")) ?? "",
    }));
  }

  return { customer, requests, documents };
}

// ------------------------------------------------------------ services

export type AdminService = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  image_url: string;
  category: string;
  price_label: string;
  cta_label: string;
  active: boolean;
  display_order: number;
};

function shapeService(row: Record<string, unknown>): AdminService {
  return {
    id: str(row, "id"),
    name: str(row, "name"),
    slug: str(row, "slug"),
    short_description: str(row, "short_description"),
    description: str(row, "description"),
    image_url: str(row, "image_url"),
    category: str(row, "category"),
    price_label: str(row, "price_label"),
    cta_label: str(row, "cta_label"),
    active: row["active"] !== false,
    display_order: Number(row["display_order"] ?? 0),
  };
}

export async function loadServices(): Promise<AdminService[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[admin] services", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(shapeService);
}

export type ServiceInput = {
  id?: string | undefined;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  image_url: string;
  category: string;
  price_label: string;
  cta_label: string;
  active: boolean;
  display_order: number;
};

export async function saveService(input: ServiceInput): Promise<{ ok: boolean; message?: string }> {
  const supabase = await db();
  const payload = {
    name: input.name,
    slug: input.slug,
    short_description: input.short_description || null,
    description: input.description || null,
    image_url: input.image_url || null,
    category: input.category || null,
    price_label: input.price_label || null,
    cta_label: input.cta_label || null,
    active: input.active,
    display_order: input.display_order,
  };

  const query = input.id
    ? supabase.from("services").update(payload).eq("id", input.id)
    : supabase.from("services").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setServiceActive(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await db();
  const { error } = await supabase.from("services").update({ active }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ------------------------------------------------------------ site content (CMS)

export type SiteContentItem = { key: string; value: string; updated_at: string };

export async function loadSiteContent(): Promise<SiteContentItem[]> {
  const supabase = await db();
  const { data, error } = await supabase.from("site_content").select("*").order("key");
  if (error) {
    console.error("[admin] site content", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    key: str(row, "key"),
    value: str(row, "value"),
    updated_at: str(row, "updated_at"),
  }));
}

export async function saveSiteContent(
  entries: { key: string; value: string }[],
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await db();
  const { error } = await supabase
    .from("site_content")
    .upsert(
      entries.map((entry) => ({ key: entry.key, value: entry.value, updated_at: new Date().toISOString() })),
      { onConflict: "key" },
    );
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export type AdminTestimonial = {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  is_active: boolean;
  display_order: number;
};

export async function loadTestimonials(): Promise<AdminTestimonial[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[admin] testimonials", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: str(row, "id"),
    name: str(row, "name"),
    location: str(row, "location"),
    quote: str(row, "quote"),
    rating: Number(row["rating"] ?? 5),
    is_active: row["is_active"] !== false,
    display_order: Number(row["display_order"] ?? 0),
  }));
}

export async function saveTestimonial(input: {
  id?: string | undefined;
  name: string;
  location: string;
  quote: string;
  rating: number;
  is_active: boolean;
  display_order: number;
}): Promise<{ ok: boolean; message?: string }> {
  const supabase = await db();
  const payload = {
    name: input.name,
    location: input.location || null,
    quote: input.quote,
    rating: input.rating,
    is_active: input.is_active,
    display_order: input.display_order,
  };
  const query = input.id
    ? supabase.from("testimonials").update(payload).eq("id", input.id)
    : supabase.from("testimonials").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = await db();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Signed upload URL for website imagery (hero, services, destinations). */
export async function signMediaUpload(
  folder: string,
  fileName: string,
): Promise<{ ok: true; path: string; uploadUrl: string; publicUrl: string } | { ok: false; message: string }> {
  const supabase = await db();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
  const path = `${folder}/${Date.now()}-${safe}`;
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not prepare the upload." };
  }
  const publicUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  return { ok: true, path, uploadUrl: data.signedUrl, publicUrl };
}

// ------------------------------------------------------------ communication

export type AdminMessage = {
  id: string;
  request_id: string | null;
  request_reference: string;
  email: string;
  sender: string;
  author: string;
  body: string;
  created_at: string;
  read_by_admin: boolean;
};

export type MessageThread = {
  email: string;
  full_name: string;
  request_id: string | null;
  request_reference: string;
  last_message: string;
  last_at: string;
  unread: number;
  messages: AdminMessage[];
};

export async function loadMessageThreads(): Promise<MessageThread[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("customer_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) {
    console.error("[admin] messages", error.message);
    return [];
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const requestIds = [...new Set(rows.map((row) => str(row, "request_id")).filter(Boolean))];
  const references = new Map<string, { reference: string; name: string }>();
  if (requestIds.length) {
    const { data: reqs } = await supabase
      .from("service_requests")
      .select("id, request_reference, full_name")
      .in("id", requestIds);
    ((reqs ?? []) as Record<string, unknown>[]).forEach((row) => {
      references.set(str(row, "id"), {
        reference: str(row, "request_reference"),
        name: str(row, "full_name"),
      });
    });
  }

  const threads = new Map<string, MessageThread>();
  for (const row of rows) {
    const email = str(row, "email").toLowerCase();
    if (!email) continue;
    const requestId = row["request_id"] ? str(row, "request_id") : null;
    const meta = requestId ? references.get(requestId) : undefined;
    const message: AdminMessage = {
      id: str(row, "id"),
      request_id: requestId,
      request_reference: meta?.reference ?? "",
      email: str(row, "email"),
      sender: str(row, "sender", "customer"),
      author: str(row, "author_name") || (str(row, "sender") === "admin" ? "Amazingfly staff" : (meta?.name ?? email)),
      body: str(row, "body"),
      created_at: str(row, "created_at"),
      read_by_admin: row["read_by_admin"] === true,
    };

    const thread = threads.get(email) ?? {
      email: message.email,
      full_name: meta?.name ?? message.email,
      request_id: requestId,
      request_reference: meta?.reference ?? "",
      last_message: "",
      last_at: "",
      unread: 0,
      messages: [],
    };
    thread.messages.push(message);
    thread.last_message = message.body;
    thread.last_at = message.created_at;
    if (meta?.name) thread.full_name = meta.name;
    if (requestId) {
      thread.request_id = requestId;
      thread.request_reference = message.request_reference;
    }
    if (message.sender === "customer" && !message.read_by_admin) thread.unread += 1;
    threads.set(email, thread);
  }

  return [...threads.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export async function loadRequestMessages(requestId: string): Promise<AdminMessage[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("customer_messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: str(row, "id"),
    request_id: row["request_id"] ? str(row, "request_id") : null,
    request_reference: "",
    email: str(row, "email"),
    sender: str(row, "sender", "customer"),
    author: str(row, "author_name") || (str(row, "sender") === "admin" ? "Amazingfly staff" : str(row, "email")),
    body: str(row, "body"),
    created_at: str(row, "created_at"),
    read_by_admin: row["read_by_admin"] === true,
  }));
}

export async function sendCustomerMessage(
  who: Who,
  input: { email: string; request_id?: string | null; body: string },
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await db();

  let userId: string | null = null;
  if (input.request_id) {
    const { data } = await supabase
      .from("service_requests")
      .select("user_id, email")
      .eq("id", input.request_id)
      .maybeSingle();
    const row = data as Record<string, unknown> | null;
    userId = row?.["user_id"] ? String(row["user_id"]) : null;
  }
  if (!userId) {
    const { data } = await supabase.from("profiles").select("*").ilike("email", input.email).maybeSingle();
    const row = data as Record<string, unknown> | null;
    if (row) userId = String(row["user_id"] ?? row["id"] ?? "") || null;
  }

  const { error } = await supabase.from("customer_messages").insert({
    request_id: input.request_id ?? null,
    user_id: userId,
    email: input.email,
    sender: "admin",
    admin_id: who.admin.id,
    author_name: who.admin.full_name || who.user.email,
    body: input.body,
    read_by_admin: true,
  });
  if (error) return { ok: false, message: error.message };

  const { logAdminAction } = await import("./admin.server");
  await logAdminAction(who, "Sent a message", {
    type: "message",
    id: input.request_id ?? null,
    detail: `To ${input.email}`,
  });
  return { ok: true };
}

export async function markThreadRead(email: string): Promise<{ ok: boolean }> {
  const supabase = await db();
  await supabase
    .from("customer_messages")
    .update({ read_by_admin: true })
    .ilike("email", email)
    .eq("sender", "customer");
  return { ok: true };
}

// ------------------------------------------------------------ activity

export type ActivityEntry = {
  id: string;
  admin_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string;
  created_at: string;
};

export async function loadActivity(limit = 200): Promise<ActivityEntry[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("admin_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin] activity", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: str(row, "id"),
    admin_name: str(row, "admin_name", "Amazingfly staff"),
    action: str(row, "action"),
    entity_type: str(row, "entity_type"),
    entity_id: row["entity_id"] ? str(row, "entity_id") : null,
    detail: str(row, "detail"),
    created_at: str(row, "created_at"),
  }));
}
