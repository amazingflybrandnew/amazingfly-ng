import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AccountRequest = {
  id: string;
  request_reference: string;
  service_type: string | null;
  service_category: string | null;
  origin_country: string | null;
  destination_country: string | null;
  travel_date: string | null;
  return_date: string | null;
  request_status: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact: string | null;
  request_details: string | null;
  document_count: number;
};

export type AccountDocument = {
  id: string;
  request_id: string;
  request_reference: string;
  document_type: string;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string;
};

export type DocumentRequestItem = {
  id: string;
  request_id: string;
  request_reference: string;
  document_name: string;
  description: string | null;
  /** "required" | "optional" */
  required_status: string;
  /** "pending" | "uploaded" | "approved" | "rejected" */
  uploaded_status: string;
  created_at: string;
  document_id: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string | null;
};

export type AccountNotification = {
  id: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
  request_id: string | null;
};


export type RequestUpdate = {
  id: string;
  status: string | null;
  message: string | null;
  created_at: string;
};

export type DashboardData = {
  requests: AccountRequest[];
  documents: AccountDocument[];
  documentRequests: DocumentRequestItem[];
  notifications: AccountNotification[];
  totals: {
    total: number;
    active: number;
    completed: number;
    documentsRequired: number;
    unreadNotifications: number;
  };
};


export const getAccountOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData> => {
    const { requireUser } = await import("./auth.server");
    const { loadAccountData } = await import("./account.server");
    const { user } = await requireUser();
    return loadAccountData(user);
  },
);

export const getRequestDetail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      request: AccountRequest;
      documents: AccountDocument[];
      updates: RequestUpdate[];
    } | null> => {
      const { requireUser } = await import("./auth.server");
      const { loadRequestDetail } = await import("./account.server");
      const { user } = await requireUser();
      return loadRequestDetail(user, data.id);
    },
  );

export const createAccountUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        document_type: z.string().trim().min(1).max(60),
        file_name: z.string().trim().min(1).max(260),
        file_size: z.number().int().positive().max(10 * 1024 * 1024),
      })
      .strict()
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; path: string; uploadUrl: string } | { ok: false; message: string }> => {
      const { requireUser } = await import("./auth.server");
      const { signUploadForOwnedRequest } = await import("./account.server");
      const { user } = await requireUser();
      return signUploadForOwnedRequest(user, data);
    },
  );

export const recordAccountDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        document_type: z.string().trim().min(1).max(60),
        file_url: z.string().trim().min(1).max(500),
        file_name: z.string().trim().min(1).max(260),
        file_size: z.number().int().nonnegative().max(10 * 1024 * 1024),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireUser } = await import("./auth.server");
    const { saveOwnedDocument } = await import("./account.server");
    const { user } = await requireUser();
    return saveOwnedDocument(user, data);
  });

export const deleteAccountDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ document_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireUser } = await import("./auth.server");
    const { removeOwnedDocument } = await import("./account.server");
    const { user } = await requireUser();
    return removeOwnedDocument(user, data.document_id);
  });

export const getDocumentDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ document_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true; url: string } | { ok: false; message: string }> => {
    const { requireUser } = await import("./auth.server");
    const { signOwnedDocumentDownload } = await import("./account.server");
    const { user } = await requireUser();
    return signOwnedDocumentDownload(user, data.document_id);
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid().nullable() })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { requireUser } = await import("./auth.server");
    const { markRead } = await import("./account.server");
    const { user } = await requireUser();
    return markRead(user, data.id);
  });
