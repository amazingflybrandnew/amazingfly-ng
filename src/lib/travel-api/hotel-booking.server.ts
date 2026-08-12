/**
 * Server-only RateHawk hotel booking sequence.
 *
 * Three provider calls, in order:
 *   1. Create booking process  — /api/b2b/v3/hotel/order/booking/form/
 *   2. Start booking process   — /api/b2b/v3/hotel/order/booking/finish/
 *   3. Check booking process   — /api/b2b/v3/hotel/order/booking/finish/status/
 *
 * Step 1 is retried up to 10 times (RateHawk documents transient failures
 * there). Step 3 is polled until the provider reports `ok` or a final failure.
 * A webhook (see src/routes/api/public/hotels/ratehawk/webhook.ts) can deliver
 * the same final status without polling; both paths write through
 * `applyBookingStatus`, which is idempotent.
 *
 * Hotels only — flights, visas, travel documents and Paystack are untouched.
 */

import {
  RateHawkApiError,
  RateHawkAuthError,
  ratehawkFetch,
} from "@/lib/ratehawk.server";

export const MAX_CREATE_ATTEMPTS = 10;
const CREATE_RETRY_DELAY_MS = 1000;
const CHECK_POLL_DELAY_MS = 2000;
const MAX_CHECK_ATTEMPTS = 40; // ~80s ceiling before we hand over to the webhook

export type BookingStatus = "created" | "started" | "processing" | "ok" | "failed";

export type BookingGuest = {
  firstName: string;
  lastName: string;
};

export type StartBookingInput = {
  partnerOrderId: string;
  email: string;
  phone: string;
  guests: BookingGuest[];
  amount: number;
  currency: string;
  comment?: string;
};

export class HotelBookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HotelBookingError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function bookingFetch<T>(path: string, body: unknown): Promise<T | null> {
  try {
    return await ratehawkFetch<T>(`/api/b2b/v3${path}`, body);
  } catch (error) {
    if (error instanceof RateHawkAuthError) {
      throw new HotelBookingError(
        "Hotel booking is not configured yet. Missing RATEHAWK_KEY_ID / RATEHAWK_API_TOKEN.",
      );
    }
    if (error instanceof RateHawkApiError) {
      throw new HotelBookingError(error.message);
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

export type BookingRecord = {
  partnerOrderId: string;
  status: BookingStatus;
  orderId: string | null;
  itemId: string | null;
  providerStatus: string | null;
  errorMessage: string | null;
};

async function admin() {
  const { createExternalSupabaseAdmin } = await import("@/lib/external-supabase.server");
  return createExternalSupabaseAdmin();
}


async function upsertBooking(row: Record<string, unknown>): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("hotel_bookings")
    .upsert({ ...row, updated_at: new Date().toISOString() }, {
      onConflict: "partner_order_id",
    });
  if (error) console.error("[hotel-booking] persist failed", error.message);
}

/**
 * Idempotent status writer shared by polling and the webhook.
 * Never downgrades a booking that already reached a final state.
 */
export async function applyBookingStatus(input: {
  partnerOrderId: string;
  status: BookingStatus;
  providerStatus?: string | null;
  orderId?: string | null;
  providerReference?: string | null;
  errorMessage?: string | null;
  payload?: unknown;
}): Promise<void> {
  const db = await admin();
  const { data: existing } = await db
    .from("hotel_bookings")
    .select("status")
    .eq("partner_order_id", input.partnerOrderId)
    .maybeSingle();

  const current = (existing as { status?: string } | null)?.status;
  if (current === "ok" || (current === "failed" && input.status !== "ok")) return;

  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.providerStatus !== undefined) patch["provider_status"] = input.providerStatus;
  if (input.orderId !== undefined && input.orderId !== null) patch["order_id"] = input.orderId;
  if (input.providerReference !== undefined) {
    patch["provider_reference"] = input.providerReference;
  }
  if (input.errorMessage !== undefined) patch["error_message"] = input.errorMessage;
  if (input.payload !== undefined) patch["payload"] = input.payload as never;

  const { error } = await db
    .from("hotel_bookings")
    .update(patch)
    .eq("partner_order_id", input.partnerOrderId);
  if (error) console.error("[hotel-booking] status write failed", error.message);

  if (input.status === "ok") await markRequestBooked(input.partnerOrderId, input.orderId ?? null);
}

/** Mirror a confirmed booking onto the linked service_request (hotel columns only). */
async function markRequestBooked(partnerOrderId: string, orderId: string | null) {
  const db = await admin();
  const { data } = await db
    .from("hotel_bookings")
    .select("request_id, order_id")
    .eq("partner_order_id", partnerOrderId)
    .maybeSingle();

  const row = data as { request_id?: string | null; order_id?: string | null } | null;
  if (!row?.request_id) return;

  await db
    .from("service_requests")
    .update({
      hotel_booking_reference: orderId ?? row.order_id ?? partnerOrderId,
      hotel_booked_at: new Date().toISOString(),
    })
    .eq("id", row.request_id);
}

/* -------------------------------------------------------------------------- */
/* 1. Create booking process (retried, max 10 attempts)                        */
/* -------------------------------------------------------------------------- */

export type CreateBookingResult = {
  partnerOrderId: string;
  orderId: string;
  itemId: string | null;
  paymentTypes: unknown[];
  attempts: number;
};

export async function createBookingProcess(input: {
  bookHash: string;
  requestId?: string | null;
  userIp?: string;
}): Promise<CreateBookingResult> {
  const partnerOrderId = crypto.randomUUID();

  await upsertBooking({
    partner_order_id: partnerOrderId,
    request_id: input.requestId ?? null,
    book_hash: input.bookHash,
    status: "created",
    attempts: 0,
  });

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      const data = await bookingFetch<{
        order_id?: string | number;
        item_id?: string | number;
        payment_types?: unknown[];
      }>("/hotel/order/booking/form/", {
        partner_order_id: partnerOrderId,
        book_hash: input.bookHash,
        language: "en",
        user_ip: input.userIp ?? "127.0.0.1",
      });

      if (!data?.order_id) throw new HotelBookingError("Provider did not return an order id.");

      const result: CreateBookingResult = {
        partnerOrderId,
        orderId: String(data.order_id),
        itemId: data.item_id != null ? String(data.item_id) : null,
        paymentTypes: data.payment_types ?? [],
        attempts: attempt,
      };

      await upsertBooking({
        partner_order_id: partnerOrderId,
        request_id: input.requestId ?? null,
        book_hash: input.bookHash,
        order_id: result.orderId,
        item_id: result.itemId,
        status: "created",
        attempts: attempt,
        payload: { payment_types: result.paymentTypes } as never,
      });

      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `[hotel-booking] create attempt ${attempt}/${MAX_CREATE_ATTEMPTS} failed`,
        error instanceof Error ? error.message : error,
      );
      if (attempt < MAX_CREATE_ATTEMPTS) await sleep(CREATE_RETRY_DELAY_MS * attempt);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "We could not start this booking with the hotel provider.";

  await applyBookingStatus({
    partnerOrderId,
    status: "failed",
    errorMessage: message,
  });

  throw new HotelBookingError(message);
}

/* -------------------------------------------------------------------------- */
/* 2. Start booking process                                                    */
/* -------------------------------------------------------------------------- */

export async function startBookingProcess(input: StartBookingInput): Promise<void> {
  const [lead] = input.guests;
  if (!lead) throw new HotelBookingError("At least one guest is required to book.");

  await bookingFetch("/hotel/order/booking/finish/", {
    user: {
      email: input.email,
      phone: input.phone,
      comment: input.comment ?? "",
    },
    supplier_data: {
      first_name_original: lead.firstName,
      last_name_original: lead.lastName,
      phone: input.phone,
      email: input.email,
    },
    partner: { partner_order_id: input.partnerOrderId },
    language: "en",
    rooms: [
      {
        guests: input.guests.map((guest) => ({
          first_name: guest.firstName,
          last_name: guest.lastName,
        })),
      },
    ],
    payment_type: {
      type: "deposit",
      amount: String(input.amount),
      currency_code: input.currency.toUpperCase(),
    },
  });

  await applyBookingStatus({
    partnerOrderId: input.partnerOrderId,
    status: "started",
    providerStatus: "processing",
  });
}

/* -------------------------------------------------------------------------- */
/* 3. Check booking process (polled until ok or final failure)                 */
/* -------------------------------------------------------------------------- */

export type CheckBookingResult = {
  status: BookingStatus;
  providerStatus: string | null;
  percent: number | null;
  message: string | null;
};

async function checkOnce(partnerOrderId: string): Promise<CheckBookingResult> {
  const data = await bookingFetch<{ status?: string; percent?: number }>(
    "/hotel/order/booking/finish/status/",
    { partner_order_id: partnerOrderId },
  );

  const providerStatus = (data?.status ?? "processing").toLowerCase();
  const percent = typeof data?.percent === "number" ? data.percent : null;

  if (providerStatus === "ok") {
    return { status: "ok", providerStatus, percent, message: null };
  }
  if (providerStatus === "error" || providerStatus === "failed") {
    return {
      status: "failed",
      providerStatus,
      percent,
      message: "The hotel provider could not confirm this booking.",
    };
  }
  return { status: "processing", providerStatus, percent, message: null };
}

/**
 * Poll the check endpoint until the provider reports `ok` or a final failure.
 * If the ceiling is reached the booking stays `processing`; the webhook will
 * settle it.
 */
export async function checkBookingProcess(
  partnerOrderId: string,
): Promise<CheckBookingResult> {
  let last: CheckBookingResult = {
    status: "processing",
    providerStatus: "processing",
    percent: null,
    message: null,
  };

  for (let attempt = 1; attempt <= MAX_CHECK_ATTEMPTS; attempt += 1) {
    try {
      last = await checkOnce(partnerOrderId);
    } catch (error) {
      last = {
        status: "failed",
        providerStatus: "error",
        percent: null,
        message:
          error instanceof Error
            ? error.message
            : "We lost contact with the hotel provider.",
      };
    }

    if (last.status === "ok" || last.status === "failed") {
      await applyBookingStatus({
        partnerOrderId,
        status: last.status,
        providerStatus: last.providerStatus,
        errorMessage: last.message,
      });
      return last;
    }

    await applyBookingStatus({
      partnerOrderId,
      status: "processing",
      providerStatus: last.providerStatus,
    });

    if (attempt < MAX_CHECK_ATTEMPTS) await sleep(CHECK_POLL_DELAY_MS);
  }

  return last;
}

/** Full sequence: create → start → check. */
export async function runBookingSequence(input: {
  bookHash: string;
  requestId?: string | null;
  userIp?: string;
  email: string;
  phone: string;
  guests: BookingGuest[];
  amount: number;
  currency: string;
  comment?: string;
}): Promise<{ partnerOrderId: string; orderId: string; result: CheckBookingResult }> {
  const created = await createBookingProcess({
    bookHash: input.bookHash,
    requestId: input.requestId ?? null,
    userIp: input.userIp ?? "",
  });

  await startBookingProcess({
    partnerOrderId: created.partnerOrderId,
    email: input.email,
    phone: input.phone,
    guests: input.guests,
    amount: input.amount,
    currency: input.currency,
    comment: input.comment ?? "",
  });

  const result = await checkBookingProcess(created.partnerOrderId);
  return { partnerOrderId: created.partnerOrderId, orderId: created.orderId, result };
}
