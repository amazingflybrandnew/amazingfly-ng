import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { FeaturedService } from "./featured-services";

export type { FeaturedService };

export const getFeaturedServices = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedService[]> => {
    const { loadPublicFeaturedServices } = await import("./featured-services.server");
    return loadPublicFeaturedServices();
  },
);

export const getAdminFeaturedServices = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedService[]> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadAdminFeaturedServices } = await import("./featured-services.server");
    await requireAdmin("manage_content");
    return loadAdminFeaturedServices();
  },
);

export const createFeaturedServiceUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ file_name: z.string().trim().min(1).max(200) }).strict().parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; path: string; uploadUrl: string; publicUrl: string } | { ok: false; message: string }
    > => {
      const { requireAdmin } = await import("./admin.server");
      const { signMediaUpload } = await import("./admin-ops.server");
      await requireAdmin("manage_content");
      return signMediaUpload("featured-services", data.file_name);
    },
  );

const input = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).default(""),
    image_url: z.string().trim().max(600).default(""),
    link_path: z.string().trim().max(300).regex(/^\/[^\s]*$/, "Use an internal path beginning with /"),
    display_order: z.number().int().min(0).max(999),
    is_active: z.boolean().default(true),
  })
  .strict();

export const saveAdminFeaturedService = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { saveFeaturedService } = await import("./featured-services.server");
    const who = await requireAdmin("manage_content");
    const result = await saveFeaturedService(data);
    if (result.ok) {
      await logAdminAction(who, data.id ? "Updated featured service" : "Added featured service", {
        type: "featured_service",
        id: data.id ?? null,
        detail: data.title,
      });
    }
    return result;
  });

export const removeAdminFeaturedService = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { deleteFeaturedService } = await import("./featured-services.server");
    const who = await requireAdmin("manage_content");
    const result = await deleteFeaturedService(data.id);
    if (result.ok) {
      await logAdminAction(who, "Removed featured service", {
        type: "featured_service",
        id: data.id,
      });
    }
    return result;
  });

export const toggleAdminFeaturedService = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { setFeaturedServiceActive } = await import("./featured-services.server");
    const who = await requireAdmin("manage_content");
    const result = await setFeaturedServiceActive(data.id, data.is_active);
    if (result.ok) {
      await logAdminAction(
        who,
        data.is_active ? "Enabled featured service" : "Disabled featured service",
        { type: "featured_service", id: data.id },
      );
    }
    return result;
  });

const reorderInput = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            display_order: z.number().int().min(0).max(999),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const reorderAdminFeaturedServices = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reorderInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { reorderFeaturedServices } = await import("./featured-services.server");
    const who = await requireAdmin("manage_content");
    const result = await reorderFeaturedServices(data.items);
    if (result.ok) {
      await logAdminAction(who, "Reordered featured services", {
        type: "featured_service",
        detail: `${data.items.length} cards`,
      });
    }
    return result;
  });
