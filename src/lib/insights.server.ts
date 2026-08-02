/**
 * Server-only insights layer for Amazingfly Travels operations:
 * the admin notification centre feed and the analytics dashboard.
 *
 * Read-only. Every export is called from a server function that has already
 * passed `requireAdmin("view")`.
 */

async function db() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

const str = (row: Record<string, unknown>, key: string, fallback = "") => {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
};

export type AdminAlert = {
  id: string;
  kind: "new_request" | "new_customer" | "missing_document" | "payment_received";
  title: string;
  detail: string;
  created_at: string;
  request_id: string | null;
};

export type AdminAlertFeed = {
  alerts: AdminAlert[];
  counts: {
    newRequests: number;
    newCustomers: number;
    missingDocuments: number;
    paymentsReceived: number;
  };
};

export async function loadAdminAlerts(): Promise<AdminAlertFeed> {
  const supabase = await db();

  const [requestsRes, profilesRes, docsRes, paymentsRes] = await Promise.all([
    supabase
      .from("service_requests")
      .select(
        "id, request_reference, full_name, email, service_type, service_category, destination_country, request_status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("profiles")
      .select("id, user_id, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("document_requests")
      .select("id, request_id, document_name, uploaded_status, required_status, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("payments")
      .select("id, request_id, amount, currency, status, transaction_reference, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const requests = (requestsRes.data ?? []) as Record<string, unknown>[];
  const referenceById = new Map(
    requests.map((row) => [str(row, "id"), str(row, "request_reference")]),
  );

  const alerts: AdminAlert[] = [];

  for (const row of requests.slice(0, 15)) {
    alerts.push({
      id: `request-${str(row, "id")}`,
      kind: "new_request",
      title: `New application ${str(row, "request_reference")}`,
      detail: `${str(row, "full_name", "Customer")} · ${
        str(row, "service_type") || str(row, "service_category") || "Travel service"
      } · ${str(row, "destination_country", "—")}`,
      created_at: str(row, "created_at"),
      request_id: str(row, "id"),
    });
  }

  for (const row of (profilesRes.data ?? []) as Record<string, unknown>[]) {
    alerts.push({
      id: `customer-${str(row, "id") || str(row, "user_id")}`,
      kind: "new_customer",
      title: "New customer account",
      detail: `${str(row, "full_name", "New customer")} · ${str(row, "email", "—")}`,
      created_at: str(row, "created_at"),
      request_id: null,
    });
  }

  const outstanding = ((docsRes.data ?? []) as Record<string, unknown>[]).filter((row) =>
    ["pending", "rejected"].includes(str(row, "uploaded_status", "pending")),
  );
  for (const row of outstanding) {
    const requestId = str(row, "request_id");
    alerts.push({
      id: `document-${str(row, "id")}`,
      kind: "missing_document",
      title: `Missing document · ${referenceById.get(requestId) ?? "Request"}`,
      detail: `${str(row, "document_name", "Document")} is still ${str(row, "uploaded_status", "pending")}`,
      created_at: str(row, "created_at"),
      request_id: requestId || null,
    });
  }

  const paid = ((paymentsRes.data ?? []) as Record<string, unknown>[]).filter(
    (row) => str(row, "status") === "payment_received",
  );
  for (const row of paid) {
    const requestId = str(row, "request_id");
    const amount = row["amount"] === null || row["amount"] === undefined ? null : Number(row["amount"]);
    alerts.push({
      id: `payment-${str(row, "id")}`,
      kind: "payment_received",
      title: `Payment received · ${referenceById.get(requestId) ?? "Request"}`,
      detail: `${amount === null ? "Amount confirmed" : `${str(row, "currency", "NGN")} ${amount.toLocaleString("en-NG")}`} · ${str(row, "transaction_reference", "—")}`,
      created_at: str(row, "created_at"),
      request_id: requestId || null,
    });
  }

  alerts.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return {
    alerts: alerts.slice(0, 60),
    counts: {
      newRequests: requests.filter((row) =>
        ["new_request", "received"].includes(str(row, "request_status")),
      ).length,
      newCustomers: (profilesRes.data ?? []).length,
      missingDocuments: outstanding.length,
      paymentsReceived: paid.length,
    },
  };
}

// ------------------------------------------------------------------ analytics

export type CountEntry = { label: string; value: number };

export type AnalyticsData = {
  totals: {
    applications: number;
    completed: number;
    active: number;
    cancelled: number;
    customers: number;
    completionRate: number;
  };
  revenue: {
    total: number;
    pending: number;
    refunded: number;
    currency: string;
    monthly: CountEntry[];
  };
  destinations: CountEntry[];
  services: CountEntry[];
  statuses: CountEntry[];
  monthlyApplications: CountEntry[];
};

function topCounts(values: string[], limit = 6): CountEntry[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const label = raw.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function monthKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function lastMonths(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }));
  }
  return keys;
}

export async function loadAnalytics(): Promise<AnalyticsData> {
  const supabase = await db();

  const [requestsRes, paymentsRes, profilesRes] = await Promise.all([
    supabase
      .from("service_requests")
      .select(
        "id, request_status, service_type, service_category, destination_country, created_at",
      )
      .limit(5000),
    supabase.from("payments").select("amount, currency, status, created_at").limit(5000),
    supabase.from("profiles").select("id").limit(5000),
  ]);

  const requests = (requestsRes.data ?? []) as Record<string, unknown>[];
  const payments = (paymentsRes.data ?? []) as Record<string, unknown>[];

  const completed = requests.filter((row) => str(row, "request_status") === "completed").length;
  const cancelled = requests.filter((row) => str(row, "request_status") === "cancelled").length;
  const total = requests.length;

  const months = lastMonths(6);
  const applicationsByMonth = new Map(months.map((key) => [key, 0]));
  for (const row of requests) {
    const key = monthKey(str(row, "created_at"));
    if (applicationsByMonth.has(key)) {
      applicationsByMonth.set(key, (applicationsByMonth.get(key) ?? 0) + 1);
    }
  }

  const revenueByMonth = new Map(months.map((key) => [key, 0]));
  let revenue = 0;
  let pendingRevenue = 0;
  let refunded = 0;
  let currency = "NGN";

  for (const row of payments) {
    const amount = row["amount"] === null || row["amount"] === undefined ? 0 : Number(row["amount"]);
    const status = str(row, "status");
    currency = str(row, "currency", currency) || currency;
    if (status === "payment_received") {
      revenue += amount;
      const key = monthKey(str(row, "created_at"));
      if (revenueByMonth.has(key)) revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);
    } else if (status === "pending_payment") {
      pendingRevenue += amount;
    } else if (status === "refunded" || status === "refund_requested") {
      refunded += amount;
    }
  }

  return {
    totals: {
      applications: total,
      completed,
      active: total - completed - cancelled,
      cancelled,
      customers: (profilesRes.data ?? []).length,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    },
    revenue: {
      total: revenue,
      pending: pendingRevenue,
      refunded,
      currency,
      monthly: months.map((label) => ({ label, value: revenueByMonth.get(label) ?? 0 })),
    },
    destinations: topCounts(requests.map((row) => str(row, "destination_country"))),
    services: topCounts(
      requests.map((row) => str(row, "service_type") || str(row, "service_category")),
    ),
    statuses: topCounts(
      requests.map((row) => str(row, "request_status")),
      8,
    ),
    monthlyApplications: months.map((label) => ({
      label,
      value: applicationsByMonth.get(label) ?? 0,
    })),
  };
}
