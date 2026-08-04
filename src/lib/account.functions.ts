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
  payment_status: string;
  agreed_fee: number | null;
  amount: number | null;
  currency: string | null;
  catalogue_id: string | null;
  requires_quote: boolean;
  document_count: number;
  /** Flight booking details (present when the request came from flight search). */
  airline: string | null;
  airline_logo_url: string | null;
  flight_number: string | null;
  flight_origin: string | null;
  flight_destination: string | null;
  flight_departure_at: string | null;
  flight_arrival_at: string | null;
  flight_duration: string | null;
  flight_stops: number | null;
  cabin_class: string | null;
  passenger_count: number | null;
  flight_price: number | null;
  flight_currency: string | null;
  flight_offer_id: string | null;
  booking_status: string | null;
  /** Hotel booking details (present when the request came from hotel search). */
  hotel_provider_id: string | null;
  hotel_name: string | null;
  hotel_image_url: string | null;
  hotel_rating: number | null;
  hotel_location: string | null;
  hotel_address: string | null;
  hotel_check_in: string | null;
  hotel_check_out: string | null;
  hotel_nights: number | null;
  hotel_guests: number | null;
  hotel_rooms: number | null;
  hotel_room_type: string | null;
  hotel_board_type: string | null;
  hotel_cancellation_policy: string | null;
  hotel_price: number | null;
  hotel_currency: string | null;
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
      documentRequests: DocumentRequestItem[];
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
        document_type: z.string().trim().min(1).max(120),
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
        document_type: z.string().trim().min(1).max(120),
        file_url: z.string().trim().min(1).max(500),
        file_name: z.string().trim().min(1).max(260),
        file_size: z.number().int().nonnegative().max(10 * 1024 * 1024),
        document_request_id: z.string().uuid().nullish(),
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

export type ConversationMessage = {
  id: string;
  sender: string;
  author: string;
  body: string;
  created_at: string;
};

export const getRequestConversation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data }): Promise<ConversationMessage[]> => {
    const { requireUser } = await import("./auth.server");
    const { loadRequestConversation } = await import("./account.server");
    const { user } = await requireUser();
    return loadRequestConversation(user, data.id);
  });

export const replyToAmazingfly = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), body: z.string().trim().min(2).max(4000) })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireUser } = await import("./auth.server");
    const { sendCustomerReply } = await import("./account.server");
    const { user } = await requireUser();
    return sendCustomerReply(user, data.id, data.body);
  });
