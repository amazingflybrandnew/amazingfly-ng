import type { FeaturedService } from "./featured-services";

async function db() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

async function publicDb() {
  const { createExternalSupabase } = await import("./external-supabase.server");
  return createExternalSupabase();
}

type Result = { ok: boolean; message?: string };

function str(row: Record<string, unknown>, key: string, fallback = ""): string {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
}

function shapeFeaturedService(row: Record<string, unknown>): FeaturedService {
  return {
    id: str(row, "id"),
    title: str(row, "title"),
    description: str(row, "description"),
    image_url: str(row, "image_url"),
    link_path: str(row, "link_path"),
    display_order: Number(row["display_order"] ?? 0),
    is_active: row["is_active"] !== false,
  };
}

export async function loadPublicFeaturedServices(): Promise<FeaturedService[]> {
  const supabase = await publicDb();
  const { data, error } = await supabase
    .from("featured_services")
    .select("id, title, description, image_url, link_path, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[featured-services] public load", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as Record<string, unknown>[]).map(shapeFeaturedService);
}

export async function loadAdminFeaturedServices(): Promise<FeaturedService[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("featured_services")
    .select("id, title, description, image_url, link_path, display_order, is_active")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[featured-services] admin load", error.message);
    throw new Error(error.message);
  }

  return ((data ?? []) as Record<string, unknown>[]).map(shapeFeaturedService);
}

export type FeaturedServiceInput = Omit<FeaturedService, "id"> & { id?: string | undefined };

export async function saveFeaturedService(input: FeaturedServiceInput): Promise<Result> {
  const supabase = await db();
  const payload = {
    title: input.title,
    description: input.description,
    image_url: input.image_url || null,
    link_path: input.link_path,
    display_order: input.display_order,
    is_active: input.is_active,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? supabase.from("featured_services").update(payload).eq("id", input.id)
    : supabase.from("featured_services").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteFeaturedService(id: string): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase.from("featured_services").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setFeaturedServiceActive(id: string, isActive: boolean): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase
    .from("featured_services")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function reorderFeaturedServices(
  items: Array<{ id: string; display_order: number }>,
): Promise<Result> {
  const supabase = await db();
  const updatedAt = new Date().toISOString();
  const results = await Promise.all(
    items.map(({ id, display_order }) =>
      supabase
        .from("featured_services")
        .update({ display_order, updated_at: updatedAt })
        .eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) return { ok: false, message: failed.error.message };
  return { ok: true };
}
