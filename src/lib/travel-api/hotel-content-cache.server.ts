/**
 * Server-only cache for ETG hotel static content (table ratehawk_hotel_content_cache).
 * Every failure is swallowed: if the cache is unavailable the caller falls back
 * to the Content API, which ETG allows for first-seen or missing hotels.
 */

const TABLE = "ratehawk_hotel_content_cache";
/** ETG: refresh static content daily or weekly, never on every search. */
export const HOTEL_CONTENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function db() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

export async function readCachedHotelContent<T>(keys: string[]): Promise<Map<string, T>> {
  const found = new Map<string, T>();
  if (!keys.length) return found;
  try {
    const cutoff = new Date(Date.now() - HOTEL_CONTENT_MAX_AGE_MS).toISOString();
    const { data, error } = await (
      await db()
    )
      .from(TABLE)
      .select("hotel_key, content")
      .in("hotel_key", keys)
      .gte("updated_at", cutoff);
    if (error) throw error;
    for (const row of (data ?? []) as { hotel_key: string; content: T }[]) {
      found.set(row.hotel_key, row.content);
    }
  } catch (error) {
    console.warn(
      "[Hotels] content cache read failed",
      error instanceof Error ? error.message : error,
    );
  }
  return found;
}

export async function writeCachedHotelContent(
  rows: { key: string; content: unknown }[],
): Promise<void> {
  if (!rows.length) return;
  try {
    const updatedAt = new Date().toISOString();
    const { error } = await (await db()).from(TABLE).upsert(
      rows.map((row) => ({
        hotel_key: row.key,
        content: row.content,
        updated_at: updatedAt,
      })),
      { onConflict: "hotel_key" },
    );
    if (error) throw error;
  } catch (error) {
    console.warn(
      "[Hotels] content cache write failed",
      error instanceof Error ? error.message : error,
    );
  }
}
