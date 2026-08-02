import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  AdminAction,
  AdminRequestDetail,
  AdminRequestRow,
  AdminRole,
  AdminStats,
} from "./admin.server";

export type AdminSession = {
  admin: {
    id: string;
    full_name: string;
    role: AdminRole;
    email: string;
    actions: AdminAction[];
  } | null;
};

export const getAdminSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminSession> => {
    const { getAdminProfile, allowedActions } = await import("./admin.server");
    const found = await getAdminProfile();
    if (!found) return { admin: null };
    return {
      admin: {
        id: found.admin.id,
        full_name: found.admin.full_name || found.user.full_name || found.user.email,
        role: found.admin.role,
        email: found.user.email,
        actions: allowedActions(found.admin),
      },
    };
  },
);

export const getAdminRequests = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.string().trim().max(40).optional(),
        search: z.string().trim().max(120).optional(),
      })
      .strict()
      .parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<{ rows: AdminRequestRow[]; stats: AdminStats }> => {
    const { requireAdmin, loadAdminRequests } = await import("./admin.server");
    await requireAdmin("view");
    return loadAdminRequests(data);
  });

export const getAdminRequestDetail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data }): Promise<AdminRequestDetail | null> => {
    const { requireAdmin, loadAdminRequestDetail } = await import("./admin.server");
    await requireAdmin("view");
    return loadAdminRequestDetail(data.id);
  });

export const updateRequestStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        status: z.string().trim().min(1).max(40),
        message: z.string().trim().max(600).optional().default(""),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, changeRequestStatus } = await import("./admin.server");
    const who = await requireAdmin("update_status");
    return changeRequestStatus(who, data.request_id, data.status, data.message);
  });

export const assignRequestStaff = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ request_id: z.string().uuid(), staff_id: z.string().uuid().nullable() })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, assignStaff } = await import("./admin.server");
    await requireAdmin("assign_staff");
    return assignStaff(data.request_id, data.staff_id);
  });

export const setRequestPriority = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        priority: z.enum(["low", "normal", "high", "urgent"]),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, setPriority } = await import("./admin.server");
    await requireAdmin("set_priority");
    return setPriority(data.request_id, data.priority);
  });

export const addRequestNote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ request_id: z.string().uuid(), note: z.string().trim().min(2).max(2000) })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, addInternalNote } = await import("./admin.server");
    const who = await requireAdmin("write_note");
    return addInternalNote(who, data.request_id, data.note);
  });

export const requestDocumentFromCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        document_name: z.string().trim().min(2).max(160),
        description: z.string().trim().max(600).optional().default(""),
        required_status: z.enum(["required", "optional"]).optional().default("required"),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, createDocumentRequest } = await import("./admin.server");
    await requireAdmin("request_document");
    return createDocumentRequest(
      data.request_id,
      data.document_name,
      data.description,
      data.required_status,
    );
  });

export const reviewUploadedDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        document_id: z.string().uuid(),
        review_status: z.enum(["approved", "rejected"]),
        review_note: z.string().trim().max(600).optional().default(""),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, reviewDocument } = await import("./admin.server");
    await requireAdmin("review_document");
    return reviewDocument(data.document_id, data.review_status, data.review_note);
  });

export const getAdminDocumentUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ document_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true; url: string } | { ok: false; message: string }> => {
    const { requireAdmin, signAdminDocumentDownload } = await import("./admin.server");
    await requireAdmin("view");
    return signAdminDocumentDownload(data.document_id);
  });
