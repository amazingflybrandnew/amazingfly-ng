import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { normalizePaymentStatus, type PaymentStatus } from "./payment-status";

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

export type AdminCustomerRequest = {
  id: string;
  request_reference: string;
  service_type: string;
  destination_country: string;
  request_status: string;
  payment_status: PaymentStatus;
  created_at: string;
  ownership: "account" | "unclaimed_guest";
};

export type AdminCustomerDocument = {
  id: string;
  request_id: string;
  document_type: string;
  file_name: string;
  uploaded_at: string;
  review_status: string;
  request_reference: string;
};

export type AdminCustomerPayment = {
  id: string;
  request_id: string;
  request_reference: string;
  amount: number | null;
  currency: string;
  provider: string;
  transaction_reference: string;
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
};

export type AdminCustomerDetail = {
  customer: AdminCustomer;
  requests: AdminCustomerRequest[];
  documents: AdminCustomerDocument[];
  payments: AdminCustomerPayment[];
};

function str(row: Record<string, unknown> | undefined, key: string, fallback = ""): string {
  const value = row?.[key];
  return value === null || value === undefined ? fallback : String(value);
}

function userId(row: Record<string, unknown> | undefined): string | null {
  if (!row) return null;
  const value = row["user_id"] ?? row["id"] ?? null;
  return value ? String(value) : null;
}

function earlier(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

async function db() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

async function loadCustomers(search?: string): Promise<AdminCustomer[]> {
  const supabase = await db();
  const [profilesRes, requestsRes] = await Promise.all([
    supabase.from("profiles").select("*").limit(1000),
    supabase
      .from("service_requests")
      .select("user_id, email, full_name, phone, nationality, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  if (profilesRes.error) console.error("[admin-customers] profiles", profilesRes.error.message);
  if (requestsRes.error) console.error("[admin-customers] requests", requestsRes.error.message);

  const profiles = (profilesRes.data ?? []) as Record<string, unknown>[];
  const requests = (requestsRes.data ?? []) as Record<string, unknown>[];
  const customers = new Map<string, AdminCustomer>();
  const profileKeysByEmail = new Map<string, Set<string>>();

  const merge = (key: string, next: AdminCustomer) => {
    const current = customers.get(key);
    if (!current) {
      customers.set(key, next);
      return;
    }
    customers.set(key, {
      ...current,
      user_id: current.user_id ?? next.user_id,
      full_name: current.full_name || next.full_name,
      email: current.email || next.email,
      phone: current.phone || next.phone,
      nationality: current.nationality || next.nationality,
      created_at: earlier(current.created_at, next.created_at),
      request_count: current.request_count,
      last_request_at: current.last_request_at,
      account_status:
        current.account_status === "registered" || next.account_status === "registered"
          ? "registered"
          : "guest",
    });
  };

  for (const profile of profiles) {
    const uid = userId(profile);
    const email = str(profile, "email").trim();
    if (!uid || !email) continue;

    const key = `user:${uid}`;
    const emailKey = email.toLowerCase();
    const keys = profileKeysByEmail.get(emailKey) ?? new Set<string>();
    keys.add(key);
    profileKeysByEmail.set(emailKey, keys);

    merge(key, {
      user_id: uid,
      full_name: str(profile, "full_name"),
      email,
      phone: str(profile, "phone"),
      nationality: str(profile, "nationality"),
      created_at: str(profile, "created_at"),
      request_count: 0,
      last_request_at: null,
      account_status: "registered",
    });
  }

  for (const request of requests) {
    const uid = request["user_id"] ? String(request["user_id"]) : null;
    const email = str(request, "email").trim();
    if (!email && !uid) continue;

    let key: string;
    if (uid) {
      key = `user:${uid}`;
    } else {
      const emailKey = email.toLowerCase();
      const matchingProfiles = profileKeysByEmail.get(emailKey);
      key = matchingProfiles?.size === 1 ? [...matchingProfiles][0]! : `guest:${emailKey}`;
    }

    merge(key, {
      user_id: uid,
      full_name: str(request, "full_name"),
      email,
      phone: str(request, "phone"),
      nationality: str(request, "nationality"),
      created_at: str(request, "created_at"),
      request_count: 0,
      last_request_at: null,
      account_status: uid ? "registered" : "guest",
    });

    const customer = customers.get(key);
    if (customer) {
      customer.request_count += 1;
      const at = str(request, "created_at");
      if (!customer.last_request_at || at > customer.last_request_at) customer.last_request_at = at;
    }
  }

  let result = [...customers.values()];
  const term = search?.trim().toLowerCase();
  if (term) {
    result = result.filter((customer) =>
      [customer.full_name, customer.email, customer.phone].join(" ").toLowerCase().includes(term),
    );
  }

  return result.sort((a, b) =>
    (b.last_request_at ?? b.created_at ?? "").localeCompare(a.last_request_at ?? a.created_at ?? ""),
  );
}

async function loadCustomerDetail(input: {
  email: string;
  user_id?: string | null | undefined;
}): Promise<AdminCustomerDetail | null> {
  const supabase = await db();
  const email = input.email.trim();
  const uid = input.user_id ?? null;
  const requestColumns =
    "id, request_reference, user_id, email, full_name, phone, nationality, service_type, service_category, destination_country, request_status, payment_status, created_at";

  const requestResults = uid
    ? await Promise.all([
        supabase.from("service_requests").select(requestColumns).eq("user_id", uid),
        supabase.from("service_requests").select(requestColumns).is("user_id", null).ilike("email", email),
      ])
    : [
        await supabase
          .from("service_requests")
          .select(requestColumns)
          .is("user_id", null)
          .ilike("email", email),
      ];

  const byId = new Map<string, Record<string, unknown>>();
  for (const result of requestResults) {
    if (result.error) console.error("[admin-customers] detail requests", result.error.message);
    for (const row of (result.data ?? []) as Record<string, unknown>[]) {
      const id = str(row, "id");
      if (id) byId.set(id, row);
    }
  }

  const rawRequests = [...byId.values()].sort((a, b) =>
    str(b, "created_at").localeCompare(str(a, "created_at")),
  );

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .limit(5);
  if (profileError) console.error("[admin-customers] detail profile", profileError.message);

  const profiles = (profileRows ?? []) as Record<string, unknown>[];
  const profile = uid
    ? profiles.find((row) => userId(row) === uid)
    : profiles.length === 1
      ? profiles[0]
      : undefined;
  const latest = rawRequests[0];

  if (!profile && !latest) return null;

  const customer: AdminCustomer = {
    user_id: uid ?? userId(profile),
    full_name: str(profile, "full_name") || str(latest, "full_name"),
    email: str(profile, "email") || str(latest, "email") || email,
    phone: str(profile, "phone") || str(latest, "phone"),
    nationality: str(profile, "nationality") || str(latest, "nationality"),
    created_at: rawRequests.reduce(
      (oldest, row) => earlier(oldest, str(row, "created_at")),
      str(profile, "created_at"),
    ),
    request_count: rawRequests.length,
    last_request_at: rawRequests.length ? str(rawRequests[0], "created_at") : null,
    account_status: uid || userId(profile) ? "registered" : "guest",
  };

  const requests: AdminCustomerRequest[] = rawRequests.map((row) => ({
    id: str(row, "id"),
    request_reference: str(row, "request_reference"),
    service_type: str(row, "service_type") || str(row, "service_category"),
    destination_country: str(row, "destination_country"),
    request_status: str(row, "request_status", "new_request"),
    payment_status: normalizePaymentStatus(row["payment_status"]),
    created_at: str(row, "created_at"),
    ownership:
      uid && row["user_id"] && String(row["user_id"]) === uid ? "account" : "unclaimed_guest",
  }));

  const requestIds = requests.map((request) => request.id).filter(Boolean);
  const referenceById = new Map(requests.map((request) => [request.id, request.request_reference]));
  let documents: AdminCustomerDocument[] = [];
  let payments: AdminCustomerPayment[] = [];

  if (requestIds.length) {
    const [documentsRes, paymentsRes] = await Promise.all([
      supabase
        .from("uploaded_documents")
        .select("id, request_id, document_type, file_name, uploaded_at, review_status")
        .in("request_id", requestIds)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("payment_transactions")
        .select("id, request_id, amount, currency, provider, transaction_reference, status, created_at, paid_at")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false }),
    ]);

    if (documentsRes.error) console.error("[admin-customers] documents", documentsRes.error.message);
    if (paymentsRes.error) console.error("[admin-customers] payments", paymentsRes.error.message);

    documents = ((documentsRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: str(row, "id"),
      request_id: str(row, "request_id"),
      document_type: str(row, "document_type", "Document"),
      file_name: str(row, "file_name"),
      uploaded_at: str(row, "uploaded_at"),
      review_status: str(row, "review_status", "pending"),
      request_reference: referenceById.get(str(row, "request_id")) ?? "",
    }));

    payments = ((paymentsRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: str(row, "id"),
      request_id: str(row, "request_id"),
      request_reference: referenceById.get(str(row, "request_id")) ?? "",
      amount:
        row["amount"] === null || row["amount"] === undefined ? null : Number(row["amount"]),
      currency: str(row, "currency", "NGN"),
      provider: str(row, "provider", "—"),
      transaction_reference: str(row, "transaction_reference"),
      status: normalizePaymentStatus(row["status"]),
      created_at: str(row, "created_at"),
      paid_at: row["paid_at"] ? String(row["paid_at"]) : null,
    }));
  }

  return { customer, requests, documents, payments };
}

export const getAdminCustomers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ search: z.string().trim().max(120).optional() }).strict().parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<AdminCustomer[]> => {
    const { requireAdmin } = await import("./admin.server");
    await requireAdmin("manage_customers");
    return loadCustomers(data.search);
  });

export const getAdminCustomerDetail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email(),
        user_id: z.string().uuid().nullable().optional(),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<AdminCustomerDetail | null> => {
    const { requireAdmin } = await import("./admin.server");
    await requireAdmin("manage_customers");
    return loadCustomerDetail(data);
  });
