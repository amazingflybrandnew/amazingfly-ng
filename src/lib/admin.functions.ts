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
    const { requireAdmin, changeRequestStatus, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("update_status");
    const result = await changeRequestStatus(who, data.request_id, data.status, data.message);
    if (result.ok) {
      await logAdminAction(who, `Changed status to ${data.status}`, {
        type: "request",
        id: data.request_id,
        detail: data.message,
      });
    }
    return result;
  });

export const assignRequestStaff = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ request_id: z.string().uuid(), staff_id: z.string().uuid().nullable() })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, assignStaff, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("assign_staff");
    const result = await assignStaff(data.request_id, data.staff_id);
    if (result.ok) {
      await logAdminAction(who, data.staff_id ? "Assigned a staff member" : "Unassigned the request", {
        type: "request",
        id: data.request_id,
      });
    }
    return result;
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
    const { requireAdmin, setPriority, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("set_priority");
    const result = await setPriority(data.request_id, data.priority);
    if (result.ok) {
      await logAdminAction(who, `Set priority to ${data.priority}`, {
        type: "request",
        id: data.request_id,
      });
    }
    return result;
  });

export const addRequestNote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ request_id: z.string().uuid(), note: z.string().trim().min(2).max(2000) })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, addInternalNote, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("write_note");
    const result = await addInternalNote(who, data.request_id, data.note);
    if (result.ok) {
      await logAdminAction(who, "Added an internal note", { type: "request", id: data.request_id });
    }
    return result;
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
    const { requireAdmin, createDocumentRequest, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("request_document");
    const result = await createDocumentRequest(
      data.request_id,
      data.document_name,
      data.description,
      data.required_status,
    );
    if (result.ok) {
      await logAdminAction(who, "Requested a document", {
        type: "request",
        id: data.request_id,
        detail: data.document_name,
      });
    }
    return result;
  });

export const reviewUploadedDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        document_id: z.string().uuid(),
        review_status: z.enum(["verified", "rejected", "replacement_required"]),
        review_note: z.string().trim().max(600).optional().default(""),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, reviewDocument, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("review_document");
    if (data.review_status !== "verified" && !data.review_note) {
      return { ok: false, message: "Please give the customer a reason." };
    }
    const result = await reviewDocument(
      data.document_id,
      data.review_status,
      data.review_note,
      who.admin.full_name ?? who.user.email,
    );
    if (result.ok) {
      const label =
        data.review_status === "verified"
          ? "Document verified"
          : data.review_status === "rejected"
            ? "Document rejected"
            : "Replacement requested";
      await logAdminAction(who, label, {
        type: "document",
        id: data.document_id,
        detail: data.review_note,
      });
    }
    return result;
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

/** Admin: record a personalised quotation so the customer can pay. */
export const setRequestQuotation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        amount: z.number().positive().max(1_000_000_000),
        currency: z.string().trim().min(3).max(3).default("NGN"),
        note: z.string().trim().max(600).optional().default(""),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, saveRequestQuote, logAdminAction } = await import("./admin.server");
    const who = await requireAdmin("manage_payments");
    const result = await saveRequestQuote(who, {
      requestId: data.request_id,
      amount: data.amount,
      currency: data.currency,
      note: data.note || null,
    });
    if (result.ok) {
      await logAdminAction(who, `Quoted ${data.currency} ${data.amount}`, {
        type: "request",
        id: data.request_id,
        detail: data.note,
      });
    }
    return result;
  });
