/**
 * Server-only CMS data access for Amazingfly Travels (Stage 6 Part 1).
 * Every admin export is called behind `requireAdmin("manage_content")`.
 */

async function db() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

async function publicDb() {
  const { createExternalSupabase } = await import("./external-supabase.server");
  return createExternalSupabase();
}

function str(row: Record<string, unknown>, key: string, fallback = ""): string {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
}

type Result = { ok: boolean; message?: string };

// ------------------------------------------------------------ hero content

export type HeroContent = {
  badge: string;
  headline: string;
  rotatingWords: string[];
  description: string;
  ctaLabel: string;
  backgroundImageUrl: string;
  travellerImageUrl: string;
};

export const HERO_KEYS = [
  "hero_badge",
  "hero_headline",
  "hero_rotating_words",
  "hero_description",
  "hero_cta_label",
  "hero_image_url",
  "hero_traveller_image_url",
] as const;

export async function loadPublicHero(): Promise<Partial<HeroContent>> {
  try {
    const supabase = await publicDb();
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value")
      .in("key", HERO_KEYS as unknown as string[]);
    if (error) return {};
    const map = new Map(
      ((data ?? []) as Record<string, unknown>[]).map((row) => [str(row, "key"), str(row, "value")]),
    );
    const pick = (key: string) => (map.get(key) ?? "").trim();
    const words = pick("hero_rotating_words")
      .split("\n")
      .map((word) => word.trim())
      .filter(Boolean);

    const hero: Partial<HeroContent> = {};
    if (pick("hero_badge")) hero.badge = pick("hero_badge");
    if (pick("hero_headline")) hero.headline = pick("hero_headline");
    if (words.length) hero.rotatingWords = words;
    if (pick("hero_description")) hero.description = pick("hero_description");
    if (pick("hero_cta_label")) hero.ctaLabel = pick("hero_cta_label");
    if (pick("hero_image_url")) hero.backgroundImageUrl = pick("hero_image_url");
    if (pick("hero_traveller_image_url")) hero.travellerImageUrl = pick("hero_traveller_image_url");
    return hero;
  } catch {
    return {};
  }
}

// ------------------------------------------------------------ destinations

export type Destination = {
  id: string;
  country: string;
  title: string;
  description: string;
  image_url: string;
  services: string[];
  status: boolean;
  display_order: number;
};

function shapeDestination(row: Record<string, unknown>): Destination {
  const services = Array.isArray(row["services"]) ? (row["services"] as unknown[]).map(String) : [];
  return {
    id: str(row, "id"),
    country: str(row, "country"),
    title: str(row, "title"),
    description: str(row, "description"),
    image_url: str(row, "image_url"),
    services,
    status: row["status"] !== false,
    display_order: Number(row["display_order"] ?? 0),
  };
}

export async function loadDestinations(): Promise<Destination[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[cms] destinations", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(shapeDestination);
}

export type DestinationInput = Omit<Destination, "id"> & { id?: string | undefined };

export async function saveDestination(input: DestinationInput): Promise<Result> {
  const supabase = await db();
  const payload = {
    country: input.country,
    title: input.title,
    description: input.description,
    image_url: input.image_url || null,
    services: input.services,
    status: input.status,
    display_order: input.display_order,
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabase.from("destinations").update(payload).eq("id", input.id)
    : supabase.from("destinations").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteDestination(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase.from("destinations").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ------------------------------------------------------------ service content

export type ServiceContent = {
  id: string;
  service_id: string | null;
  slug: string;
  title: string;
  description: string;
  requirements: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
};

export type ServiceContentRow = ServiceContent & { service_name: string };

export async function loadServiceContent(): Promise<{
  entries: ServiceContentRow[];
  services: { id: string; name: string; slug: string }[];
}> {
  const supabase = await db();
  const [contentRes, servicesRes] = await Promise.all([
    supabase.from("service_content").select("*").order("display_order", { ascending: true }),
    supabase.from("services").select("id, name, slug").order("display_order", { ascending: true }),
  ]);

  if (contentRes.error) console.error("[cms] service content", contentRes.error.message);

  const services = ((servicesRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: str(row, "id"),
    name: str(row, "name"),
    slug: str(row, "slug"),
  }));
  const nameById = new Map(services.map((service) => [service.id, service.name]));

  const entries = ((contentRes.data ?? []) as Record<string, unknown>[]).map((row) => {
    const serviceId = row["service_id"] ? str(row, "service_id") : null;
    return {
      id: str(row, "id"),
      service_id: serviceId,
      slug: str(row, "slug"),
      title: str(row, "title"),
      description: str(row, "description"),
      requirements: str(row, "requirements"),
      image_url: str(row, "image_url"),
      is_active: row["is_active"] !== false,
      display_order: Number(row["display_order"] ?? 0),
      service_name: (serviceId ? nameById.get(serviceId) : "") ?? "",
    } satisfies ServiceContentRow;
  });

  return { entries, services };
}

export type ServiceContentInput = {
  id?: string | undefined;
  service_id: string | null;
  slug: string;
  title: string;
  description: string;
  requirements: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
};

export async function saveServiceContent(input: ServiceContentInput): Promise<Result> {
  const supabase = await db();
  const payload = {
    service_id: input.service_id,
    slug: input.slug || null,
    title: input.title,
    description: input.description,
    requirements: input.requirements,
    image_url: input.image_url || null,
    is_active: input.is_active,
    display_order: input.display_order,
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabase.from("service_content").update(payload).eq("id", input.id)
    : supabase.from("service_content").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteServiceContent(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase.from("service_content").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

// ------------------------------------------------------------ testimonials

export type CmsTestimonial = {
  id: string;
  customer_name: string;
  country: string;
  review: string;
  rating: number;
  image_url: string;
  is_active: boolean;
  display_order: number;
};

export async function loadCmsTestimonials(): Promise<CmsTestimonial[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[cms] testimonials", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: str(row, "id"),
    customer_name: str(row, "name"),
    country: str(row, "country") || str(row, "location"),
    review: str(row, "quote"),
    rating: Number(row["rating"] ?? 5),
    image_url: str(row, "image_url"),
    is_active: row["is_active"] !== false,
    display_order: Number(row["display_order"] ?? 0),
  }));
}

export type CmsTestimonialInput = Omit<CmsTestimonial, "id"> & { id?: string | undefined };

export async function saveCmsTestimonial(input: CmsTestimonialInput): Promise<Result> {
  const supabase = await db();
  const payload = {
    name: input.customer_name,
    country: input.country || null,
    location: input.country || null,
    quote: input.review,
    rating: input.rating,
    image_url: input.image_url || null,
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

export async function deleteCmsTestimonial(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
