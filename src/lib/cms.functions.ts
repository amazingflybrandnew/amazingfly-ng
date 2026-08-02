import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  CmsTestimonial,
  Destination,
  HeroContent,
  ServiceContentRow,
} from "./cms.server";

export type { CmsTestimonial, Destination, HeroContent, ServiceContentRow };

// ---------------------------------------------------------------- public

/** Public hero content for the homepage. No auth required. */
export const getHeroContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<Partial<HeroContent>> => {
    const { loadPublicHero } = await import("./cms.server");
    return loadPublicHero();
  },
);

// ---------------------------------------------------------------- destinations

export const getAdminDestinations = createServerFn({ method: "GET" }).handler(
  async (): Promise<Destination[]> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadDestinations } = await import("./cms.server");
    await requireAdmin("manage_content");
    return loadDestinations();
  },
);

const destinationInput = z
  .object({
    id: z.string().uuid().optional(),
    country: z.string().trim().min(2).max(120),
    title: z.string().trim().max(160).optional().default(""),
    description: z.string().trim().max(4000).optional().default(""),
    image_url: z.string().trim().max(600).optional().default(""),
    services: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
    status: z.boolean().optional().default(true),
    display_order: z.number().int().min(0).max(999).optional().default(0),
  })
  .strict();

export const saveAdminDestination = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => destinationInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { saveDestination } = await import("./cms.server");
    const who = await requireAdmin("manage_content");
    const result = await saveDestination(data);
    if (result.ok) {
      await logAdminAction(who, data.id ? "Updated a destination" : "Added a destination", {
        type: "destination",
        id: data.id ?? null,
        detail: data.country,
      });
    }
    return result;
  });

export const removeAdminDestination = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { deleteDestination } = await import("./cms.server");
    const who = await requireAdmin("manage_content");
    const result = await deleteDestination(data.id);
    if (result.ok) {
      await logAdminAction(who, "Removed a destination", { type: "destination", id: data.id });
    }
    return result;
  });

// ---------------------------------------------------------------- service content

export const getAdminServiceContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    entries: ServiceContentRow[];
    services: { id: string; name: string; slug: string }[];
  }> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadServiceContent } = await import("./cms.server");
    await requireAdmin("manage_content");
    return loadServiceContent();
  },
);

const serviceContentInput = z
  .object({
    id: z.string().uuid().optional(),
    service_id: z.string().uuid().nullable().optional().default(null),
    slug: z.string().trim().max(120).optional().default(""),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(6000).optional().default(""),
    requirements: z.string().trim().max(6000).optional().default(""),
    image_url: z.string().trim().max(600).optional().default(""),
    is_active: z.boolean().optional().default(true),
    display_order: z.number().int().min(0).max(999).optional().default(0),
  })
  .strict();

export const saveAdminServiceContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => serviceContentInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { saveServiceContent } = await import("./cms.server");
    const who = await requireAdmin("manage_content");
    const result = await saveServiceContent({ ...data, service_id: data.service_id ?? null });
    if (result.ok) {
      await logAdminAction(who, data.id ? "Updated service content" : "Added service content", {
        type: "service_content",
        id: data.id ?? null,
        detail: data.title,
      });
    }
    return result;
  });

export const removeAdminServiceContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { deleteServiceContent } = await import("./cms.server");
    const who = await requireAdmin("manage_content");
    const result = await deleteServiceContent(data.id);
    if (result.ok) {
      await logAdminAction(who, "Removed service content", { type: "service_content", id: data.id });
    }
    return result;
  });

// ---------------------------------------------------------------- testimonials

export const getCmsTestimonials = createServerFn({ method: "GET" }).handler(
  async (): Promise<CmsTestimonial[]> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadCmsTestimonials } = await import("./cms.server");
    await requireAdmin("manage_content");
    return loadCmsTestimonials();
  },
);

const testimonialInput = z
  .object({
    id: z.string().uuid().optional(),
    customer_name: z.string().trim().min(2).max(120),
    country: z.string().trim().max(120).optional().default(""),
    review: z.string().trim().min(10).max(2000),
    rating: z.number().int().min(1).max(5).optional().default(5),
    image_url: z.string().trim().max(600).optional().default(""),
    is_active: z.boolean().optional().default(true),
    display_order: z.number().int().min(0).max(999).optional().default(0),
  })
  .strict();

export const saveCmsTestimonialFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => testimonialInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { saveCmsTestimonial } = await import("./cms.server");
    const who = await requireAdmin("manage_content");
    const result = await saveCmsTestimonial(data);
    if (result.ok) {
      await logAdminAction(who, data.id ? "Updated a testimonial" : "Added a testimonial", {
        type: "testimonial",
        id: data.id ?? null,
        detail: data.customer_name,
      });
    }
    return result;
  });

export const removeCmsTestimonialFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { deleteCmsTestimonial } = await import("./cms.server");
    const who = await requireAdmin("manage_content");
    const result = await deleteCmsTestimonial(data.id);
    if (result.ok) {
      await logAdminAction(who, "Removed a testimonial", { type: "testimonial", id: data.id });
    }
    return result;
  });
