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

const input = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).default(""),
    image_url: z.string().trim().max(600).default(""),
    link_path: z.string().trim().regex(/^\/[^\s]*$/),
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
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin.server");
    const { deleteFeaturedService } = await import("./featured-services.server");
    await requireAdmin("manage_content");
    return deleteFeaturedService(data.id);
  });

export const toggleAdminFeaturedService = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).strict().parse(data))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin.server");
    const { setFeaturedServiceActive } = await import("./featured-services.server");
    await requireAdmin("manage_content");
    return setFeaturedServiceActive(data.id, data.is_active);
  });
