/**
 * Client-callable server functions for the service package catalogue.
 * Public listing is unauthenticated; every write requires an admin session.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CatalogueItem } from "./catalogue/visa-catalogue";
import type { PackageResult } from "./packages.server";

const packageSchema = z
  .object({
    id: z.string().trim().max(90).optional(),
    category: z.string().trim().min(1).max(60),
    country: z.string().trim().min(1).max(120),
    flag: z.string().trim().max(16).optional(),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1200).optional(),
    serviceType: z.string().trim().max(120).optional(),
    price: z.number().min(0).max(1_000_000_000),
    priceFrom: z.boolean().optional(),
    processingTime: z.string().trim().max(160).optional(),
    validity: z.string().trim().max(160).optional(),
    requirements: z.array(z.string().trim().max(200)).max(40),
    optionalDocuments: z.array(z.string().trim().max(200)).max(40).optional(),
    includes: z.array(z.string().trim().max(200)).max(40).optional(),
    requiresQuote: z.boolean().optional(),
    active: z.boolean(),
  })
  .strict();

export const getPublicPackages = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogueItem[]> => {
    const { loadPublicPackages } = await import("./packages.server");
    return loadPublicPackages();
  },
);

export const getAdminPackages = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogueItem[]> => {
    const { requireAdmin } = await import("./admin.server");
    await requireAdmin("manage_services");
    const { loadAdminPackages } = await import("./packages.server");
    return loadAdminPackages();
  },
);

export const saveServicePackage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => packageSchema.parse(data))
  .handler(async ({ data }): Promise<PackageResult> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("manage_services");
    const { savePackage } = await import("./packages.server");
    const result = await savePackage({
      ...data,
      serviceType: data.serviceType ?? "Service",
    });
    if (result.ok) await logAdminAction(who, `Saved service package ${data.name}`);
    return result;
  });

export const toggleServicePackage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().trim().min(1).max(90), active: z.boolean() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<PackageResult> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("manage_services");
    const { setPackageActive } = await import("./packages.server");
    const result = await setPackageActive(data.id, data.active);
    if (result.ok) {
      await logAdminAction(who, `${data.active ? "Activated" : "Deactivated"} package ${data.id}`);
    }
    return result;
  });

export const deleteServicePackage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().trim().min(1).max(90) }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<PackageResult> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("manage_services");
    const { deletePackage } = await import("./packages.server");
    const result = await deletePackage(data.id);
    if (result.ok) await logAdminAction(who, `Removed package ${data.id}`);
    return result;
  });
