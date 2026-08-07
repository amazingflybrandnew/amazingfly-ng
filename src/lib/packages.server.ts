/**
 * Server-only access to the service package catalogue (public.service_catalogue).
 *
 * Public reads use the publishable client (RLS: active packages only).
 * Admin writes go through the service-role client and are always called behind
 * `requireAdmin("manage_services")`.
 *
 * Nothing in this file touches payments — packages only describe price,
 * processing time and requirements; the payment flow reads them as before.
 */

import type { CatalogueCategory, CatalogueItem } from "./catalogue/visa-catalogue";

const TABLE = "service_catalogue";

async function db() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

async function publicDb() {
  const { createExternalSupabase } = await import("./external-supabase.server");
  return createExternalSupabase();
}

export type PackageResult = { ok: boolean; message?: string };

function str(row: Record<string, unknown>, key: string, fallback = ""): string {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
}

function list(row: Record<string, unknown>, key: string): string[] {
  const value = row[key];
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

const CATEGORY_ALIASES: Record<string, CatalogueCategory> = {
  visa: "visa",
  flights: "flights",
  flight: "flights",
  hotels: "hotels",
  hotel: "hotels",
  document: "police-character-certificate",
  "proof-of-funds": "proof-of-funds",
  "police-character-certificate": "police-character-certificate",
  "yellow-fever-card": "yellow-fever-card",
  "travel-insurance": "travel-insurance",
};

function shape(row: Record<string, unknown>): CatalogueItem {
  const flag = str(row, "flag");
  const description = str(row, "description");
  const validity = str(row, "validity");
  return {
    id: str(row, "id"),
    category: CATEGORY_ALIASES[str(row, "category", "visa")] ?? "visa",
    country: str(row, "country"),
    ...(flag ? { flag } : {}),
    name: str(row, "name"),
    ...(description ? { description } : {}),
    serviceType: str(row, "service_type", "Service"),
    price: Number(row["price"] ?? 0),
    currency: "NGN",
    priceFrom: row["price_from"] === true,
    processingTime: str(row, "processing_time"),
    ...(validity ? { validity } : {}),
    requirements: list(row, "requirements"),
    optionalDocuments: list(row, "optional_documents"),
    includes: list(row, "includes"),
    requiresQuote: row["requires_quote"] === true,
    active: row["active"] !== false,
  };
}

/** Active packages for the public website / request wizard. Never throws. */
export async function loadPublicPackages(): Promise<CatalogueItem[]> {
  try {
    const supabase = await publicDb();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("active", true)
      .order("category", { ascending: true })
      .order("country", { ascending: true })
      .order("price", { ascending: true });
    if (error) {
      console.error("[packages] public read", error.message);
      return [];
    }
    return ((data ?? []) as Record<string, unknown>[]).map(shape);
  } catch (error) {
    console.error("[packages] public read failed", error);
    return [];
  }
}

/** Every package, including inactive ones, for the admin manager. */
export async function loadAdminPackages(): Promise<CatalogueItem[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("category", { ascending: true })
    .order("country", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.error("[packages] admin read", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(shape);
}

export type PackageInput = {
  id?: string | undefined;
  category: string;
  country: string;
  flag?: string | undefined;
  name: string;
  description?: string | undefined;
  serviceType: string;
  price: number;
  priceFrom?: boolean | undefined;
  processingTime?: string | undefined;
  validity?: string | undefined;
  requirements: string[];
  optionalDocuments?: string[] | undefined;
  includes?: string[] | undefined;
  requiresQuote?: boolean | undefined;
  active: boolean;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export async function savePackage(input: PackageInput): Promise<PackageResult> {
  const supabase = await db();
  const id = (input.id ?? "").trim() || `${slugify(input.country)}-${slugify(input.name)}`;
  const payload: Record<string, unknown> = {
    id,
    category: input.category,
    country: input.country,
    flag: input.flag ?? null,
    name: input.name,
    description: input.description ?? "",
    service_type: input.serviceType || "Service",
    price: Number.isFinite(input.price) ? input.price : 0,
    currency: "NGN",
    price_from: input.priceFrom ?? false,
    processing_time: input.processingTime ?? "",
    validity: input.validity ?? "",
    requirements: input.requirements,
    optional_documents: input.optionalDocuments ?? [],
    includes: input.includes ?? [],
    requires_quote: input.requiresQuote ?? false,
    active: input.active,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[packages] save", error.message);
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "Package saved." };
}

export async function setPackageActive(id: string, active: boolean): Promise<PackageResult> {
  const supabase = await db();
  const { error } = await supabase
    .from(TABLE)
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: active ? "Package activated." : "Package deactivated." };
}

export async function deletePackage(id: string): Promise<PackageResult> {
  const supabase = await db();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Package removed." };
}
