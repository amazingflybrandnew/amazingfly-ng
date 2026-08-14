/**
 * Server-only RateHawk hotel booking sequence.
 *
 * Three provider calls, in order:
 *   1. Create booking process  — /api/b2b/v3/hotel/order/booking/form/
 *   2. Start booking process   — /api/b2b/v3/hotel/order/booking/finish/
 *   3. Check booking process   — /api/b2b/v3/hotel/order/booking/finish/status/
 *
 * A webhook can deliver the same final status without polling; both paths
 * write through applyBookingStatus(), which is idempotent.
 */

import {
  RateHawkApiError,
  RateHawkAuthError,
  ratehawkFetch,
} from "@/lib/ratehawk.server";

export const MAX_CREATE_ATTEMPTS = 10;
const CREATE_RETRY_DELAY_MS = 1000;
const CHECK_POLL_DELAY_MS = 2000;
const MAX_CHECK_ATTEMPTS = 40;

export type BookingStatus = "created" | "started" | "processing" | "ok" | "failed";
export type HotelBookingPaymentType = "deposit" | "hotel";

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
  paymentType: HotelBookingPaymentType;
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
    .upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: "partner_order_id" },
    );
  if (error) console.error("[hotel-booking] persist failed", error.message);
}

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
  if (input.providerReference !== undefined) patch["provider_reference"] = input.providerReference;
  if (input.errorMessage !== undefined) patch["error_message"] = input.errorMessage;
  if (input.payload !== undefined) patch["payload"] = input.payload as never;

  const { error } = await db
    .from("hotel_bookings")
    .update(patch)
    .eq("partner_order_id", input.partnerOrderId);
  if (error) console.error("[hotel-booking] status write failed", error.message);

  if (input.status === "ok") {
    await markRequestBooked(input.partnerOrderId, input.orderId ?? null);
  } else if (input.status === "failed") {
    await markRequestBookingStatus(input.partnerOrderId, "failed");
  } else {
    await markRequestBookingStatus(input.partnerOrderId, "processing");
  }
}

async function markRequestBookingStatus(partnerOrderId: string, status: string) {
  const db = await admin();
  const { data } = await db
    .from("hotel_bookings")
    .select("request_id")
    .eq("partner_order_id", partnerOrderId)
    .maybeSingle();
  const requestId = (data as { request_id?: string | null } | null)?.request_id;
  if (!requestId) return;
  await db.from("service_requests").update({ booking_status: status }).eq("id", requestId);
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
      booking_status: "confirmed",
      hotel_booking_reference: orderId ?? row.order_id ?? partnerOrderId,
      booking_reference: orderId ?? row.order_id ?? partnerOrderId,
      pnr: orderId ?? row.order_id ?? partnerOrderId,
      hotel_booked_at: new Date().toISOString(),
    })
    .eq("id", row.request_id);
}

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

  await applyBookingStatus({ partnerOrderId, status: "failed", errorMessage: message });
  throw new HotelBookingError(message);
}

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
      type: input.paymentType,
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

  if (providerStatus === "ok") return { status: "ok", providerStatus, percent, message: null };
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
          error instanceof Error ? error.message : "We lost contact with the hotel provider.",
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

export async function runBookingSequence(input: {
  bookHash: string;
  requestId?: string | null;
  userIp?: string;
  email: string;
  phone: string;
  guests: BookingGuest[];
  amount: number;
  currency: string;
  paymentType: HotelBookingPaymentType;
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
    paymentType: input.paymentType,
    comment: input.comment ?? "",
  });

  const result = await checkBookingProcess(created.partnerOrderId);
  return { partnerOrderId: created.partnerOrderId, orderId: created.orderId, result };
}

/**
 * Starts a booking using only server-persisted hotel data. This prevents the
 * browser from resubmitting or altering a short-lived book_hash/payment type.
 * Current automated flow intentionally supports one room; multi-room bookings
 * remain with the specialist workflow until room-to-guest allocation is stored.
 */
export async function bookStoredHotelRequest(
  requestId: string,
  expectedPaymentType: HotelBookingPaymentType,
): Promise<{ partnerOrderId: string; orderId: string | null; status: BookingStatus }> {
  const db = await admin();

  const { data: existing } = await db
    .from("hotel_bookings")
    .select("partner_order_id, status, order_id")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const row = existing as { partner_order_id: string; status: BookingStatus; order_id?: string | null };
    return {
      partnerOrderId: row.partner_order_id,
      orderId: row.order_id ?? null,
      status: row.status,
    };
  }

  const { data: request, error: requestError } = await db
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    throw new HotelBookingError("We could not find this hotel booking request.");
  }

  const row = request as Record<string, unknown>;
  const category = String(row["service_category"] ?? "").toLowerCase();
  if (category !== "hotels" && !String(row["service_type"] ?? "").toLowerCase().includes("hotel")) {
    throw new HotelBookingError("This request is not a hotel booking.");
  }

  const bookHash = String(row["hotel_book_hash"] ?? "").trim();
  if (!bookHash) throw new HotelBookingError("This hotel rate no longer has a confirmed booking hash.");

  const paymentType = String(row["hotel_payment_type"] ?? "");
  if (paymentType !== expectedPaymentType) {
    throw new HotelBookingError("The selected hotel payment method does not match this booking action.");
  }

  if (Boolean(row["hotel_payment_requires_card"])) {
    throw new HotelBookingError(
      "This pay-at-property rate requires a card guarantee. Secure card tokenization is not enabled yet.",
    );
  }

  const roomCount = Number(row["hotel_rooms"] ?? 1);
  if (roomCount !== 1) {
    throw new HotelBookingError(
      "Online RateHawk confirmation currently supports one room per booking. Please use one room or contact support for a multi-room stay.",
    );
  }

  const guestCount = Math.max(1, Number(row["hotel_guests"] ?? row["traveller_count"] ?? 1));
  const { data: passengerRows, error: passengerError } = await db
    .from("booking_passengers")
    .select("first_name, last_name, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (passengerError) throw new HotelBookingError("We could not load the hotel guest details.");

  const guests = ((passengerRows ?? []) as Record<string, unknown>[])
    .map((guest) => ({
      firstName: String(guest["first_name"] ?? "").trim(),
      lastName: String(guest["last_name"] ?? "").trim(),
    }))
    .filter((guest) => guest.firstName && guest.lastName);

  if (guests.length !== guestCount) {
    throw new HotelBookingError(
      `Please provide traveller details for all ${guestCount} hotel guest(s) before booking.`,
    );
  }

  const email = String(row["email"] ?? "").trim();
  const phone = String(row["phone"] ?? "").trim();
  if (!email || !phone || phone === "—") {
    throw new HotelBookingError("A booking contact email and phone number are required.");
  }

  const amount = Number(row["hotel_provider_payment_amount"] ?? row["hotel_price"] ?? 0);
  const currency = String(
    row["hotel_provider_payment_currency"] ?? row["hotel_currency"] ?? "USD",
  ).trim();

  await db.from("service_requests").update({ booking_status: "processing" }).eq("id", requestId);

  try {
    const booked = await runBookingSequence({
      bookHash,
      requestId,
      email,
      phone,
      guests,
      amount,
      currency,
      paymentType: expectedPaymentType,
    });
    return {
      partnerOrderId: booked.partnerOrderId,
      orderId: booked.orderId,
      status: booked.result.status,
    };
  } catch (error) {
    await db.from("service_requests").update({ booking_status: "failed" }).eq("id", requestId);
    throw error;
  }
}
