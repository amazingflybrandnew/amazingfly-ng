/** Server-only RateHawk booking, polling, certification and cancellation flow. */

import { getRequestHeader } from "@tanstack/react-start/server";

import {
  isRateHawkSandbox,
  RateHawkApiError,
  RateHawkAuthError,
  ratehawkRequest,
} from "@/lib/ratehawk.server";

export const MAX_CREATE_ATTEMPTS = 10;
const CREATE_RETRY_DELAY_MS = 1000;
const CHECK_POLL_DELAY_MS = 5000;
const DEFAULT_BOOKING_TIMEOUT_MS = 120_000;

export type BookingStatus = "created" | "started" | "processing" | "ok" | "failed";
export type HotelBookingPaymentType = "deposit" | "hotel";
export type CertificationScenario =
  | "unknown_success"
  | "unknown_soldout"
  | "unknown_book_limit";

export const CERTIFICATION_SCENARIOS: readonly CertificationScenario[] = [
  "unknown_success",
  "unknown_soldout",
  "unknown_book_limit",
] as const;

export type BookingGuest = { firstName: string; lastName: string };

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

export type BookingFormPaymentOption = {
  type: string;
  amount: string;
  currencyCode: string;
  requiresCard: boolean;
  requiresCvc: boolean;
};

export class HotelBookingError extends Error {
  constructor(
    message: string,
    public providerCode: string | null = null,
    public providerStatus: number | null = null,
  ) {
    super(message);
    this.name = "HotelBookingError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveBookingRequestIp(explicit?: string): string {
  const forwarded = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
  const resolved =
    explicit?.trim() ||
    getRequestHeader("cf-connecting-ip")?.trim() ||
    getRequestHeader("x-real-ip")?.trim() ||
    forwarded;
  if (!resolved) {
    throw new HotelBookingError(
      "We could not determine the request IP required by the hotel provider. Please retry from the booking page.",
    );
  }
  return resolved;
}

function bookingTimeoutMs(): number {
  const configured = Number(process.env["RATEHAWK_BOOKING_TIMEOUT_MS"] ?? "");
  return Number.isFinite(configured) && configured >= 10_000
    ? configured
    : DEFAULT_BOOKING_TIMEOUT_MS;
}

async function bookingRequest<T>(path: string, body: unknown) {
  try {
    return await ratehawkRequest<T>(`/api/b2b/v3${path}`, body);
  } catch (error) {
    if (error instanceof RateHawkAuthError) {
      throw new HotelBookingError(
        "Hotel booking is not configured yet. Missing RATEHAWK_KEY_ID / RATEHAWK_API_TOKEN.",
      );
    }
    if (error instanceof RateHawkApiError) {
      throw new HotelBookingError(error.message, error.code, error.status);
    }
    throw error;
  }
}

function errorCode(error: unknown): string {
  return error instanceof HotelBookingError ? error.providerCode ?? "" : "";
}

function isTransientBookingError(error: unknown): boolean {
  if (!(error instanceof HotelBookingError)) return false;
  return (
    error.providerCode === "unknown" ||
    error.providerCode === "timeout" ||
    (error.providerStatus !== null && error.providerStatus >= 500)
  );
}

function isRetryableCreateError(error: unknown): boolean {
  const code = errorCode(error);
  return (
    isTransientBookingError(error) ||
    code === "duplicate_reservation" ||
    code === "double_booking_form"
  );
}

function partnerOrderId(scenario?: CertificationScenario | null): string {
  const base = crypto.randomUUID();
  if (!scenario) return base;
  if (!isRateHawkSandbox()) {
    throw new HotelBookingError("Certification scenarios can only be used in the RateHawk sandbox.");
  }
  return `${base}_${scenario}`;
}

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
  paymentTypes: BookingFormPaymentOption[];
  attempts: number;
};

function mapBookingFormPaymentTypes(
  values: Array<Record<string, unknown>> | undefined,
): BookingFormPaymentOption[] {
  return (values ?? [])
    .map((value) => ({
      type: String(value["type"] ?? ""),
      amount: String(value["amount"] ?? ""),
      currencyCode: String(value["currency_code"] ?? ""),
      requiresCard: Boolean(value["is_need_credit_card_data"]),
      requiresCvc: Boolean(value["is_need_cvc"]),
    }))
    .filter((value) => value.type && value.amount && value.currencyCode);
}

export async function createBookingProcess(input: {
  bookHash: string;
  requestId?: string | null;
  userIp?: string;
  certificationScenario?: CertificationScenario | null;
}): Promise<CreateBookingResult> {
  let lastError: unknown = null;
  let lastPartnerOrderId = "";

  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt += 1) {
    const currentPartnerOrderId = partnerOrderId(input.certificationScenario);
    lastPartnerOrderId = currentPartnerOrderId;
    await upsertBooking({
      partner_order_id: currentPartnerOrderId,
      request_id: input.requestId ?? null,
      book_hash: input.bookHash,
      status: "created",
      attempts: attempt,
    });

    try {
      const envelope = await bookingRequest<{
        order_id?: string | number;
        item_id?: string | number;
        payment_types?: Array<Record<string, unknown>>;
      }>("/hotel/order/booking/form/", {
        partner_order_id: currentPartnerOrderId,
        book_hash: input.bookHash,
        language: "en",
        user_ip: resolveBookingRequestIp(input.userIp),
      });
      const data = envelope.data;
      if (!data?.order_id) throw new HotelBookingError("Provider did not return an order id.");

      const result: CreateBookingResult = {
        partnerOrderId: currentPartnerOrderId,
        orderId: String(data.order_id),
        itemId: data.item_id != null ? String(data.item_id) : null,
        paymentTypes: mapBookingFormPaymentTypes(data.payment_types),
        attempts: attempt,
      };
      await upsertBooking({
        partner_order_id: currentPartnerOrderId,
        request_id: input.requestId ?? null,
        book_hash: input.bookHash,
        order_id: result.orderId,
        item_id: result.itemId,
        status: "created",
        attempts: attempt,
        provider_status: envelope.status ?? "ok",
        payload: { payment_types: result.paymentTypes } as never,
      });
      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `[hotel-booking] create attempt ${attempt}/${MAX_CREATE_ATTEMPTS} failed`,
        error instanceof Error ? error.message : error,
      );
      await upsertBooking({
        partner_order_id: currentPartnerOrderId,
        request_id: input.requestId ?? null,
        book_hash: input.bookHash,
        status: "failed",
        attempts: attempt,
        provider_status: errorCode(error) || "create_error",
        error_message: error instanceof Error ? error.message : "Create booking process failed.",
      });
      if (!isRetryableCreateError(error) || attempt === MAX_CREATE_ATTEMPTS) break;
      await sleep(CREATE_RETRY_DELAY_MS * attempt);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "We could not start this booking with the hotel provider.";
  if (lastPartnerOrderId) {
    await applyBookingStatus({
      partnerOrderId: lastPartnerOrderId,
      status: "failed",
      providerStatus: errorCode(lastError) || "create_failed",
      errorMessage: message,
    });
  }
  throw new HotelBookingError(message, errorCode(lastError) || null);
}

export async function startBookingProcess(input: StartBookingInput): Promise<void> {
  const [lead] = input.guests;
  if (!lead) throw new HotelBookingError("At least one guest is required to book.");

  try {
    const envelope = await bookingRequest("/hotel/order/booking/finish/", {
      user: { email: input.email, phone: input.phone, comment: input.comment ?? "" },
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
      providerStatus: envelope.status ?? "processing",
    });
  } catch (error) {
    if (isTransientBookingError(error)) {
      await applyBookingStatus({
        partnerOrderId: input.partnerOrderId,
        status: "processing",
        providerStatus: errorCode(error) || "processing",
        errorMessage: error instanceof Error ? error.message : null,
      });
      return;
    }
    throw error;
  }
}

export type CheckBookingResult = {
  status: BookingStatus;
  providerStatus: string | null;
  percent: number | null;
  message: string | null;
};

async function checkOnce(partnerOrderId: string): Promise<CheckBookingResult> {
  try {
    const envelope = await bookingRequest<{ percent?: number }>(
      "/hotel/order/booking/finish/status/",
      { partner_order_id: partnerOrderId },
    );
    const providerStatus = String(envelope.status ?? "processing").toLowerCase();
    const percent = typeof envelope.data?.percent === "number" ? envelope.data.percent : null;
    if (providerStatus === "ok") {
      return { status: "ok", providerStatus, percent, message: null };
    }
    return { status: "processing", providerStatus, percent, message: null };
  } catch (error) {
    if (isTransientBookingError(error)) {
      return {
        status: "processing",
        providerStatus: errorCode(error) || "processing",
        percent: null,
        message: error instanceof Error ? error.message : null,
      };
    }
    return {
      status: "failed",
      providerStatus: errorCode(error) || "error",
      percent: null,
      message:
        error instanceof Error ? error.message : "The hotel provider could not confirm this booking.",
    };
  }
}

export async function checkBookingProcess(partnerOrderId: string): Promise<CheckBookingResult> {
  const deadline = Date.now() + bookingTimeoutMs();
  let last: CheckBookingResult = {
    status: "processing",
    providerStatus: "processing",
    percent: null,
    message: null,
  };

  while (Date.now() + CHECK_POLL_DELAY_MS < deadline) {
    last = await checkOnce(partnerOrderId);
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
      errorMessage: last.message,
    });
    await sleep(CHECK_POLL_DELAY_MS);
  }

  last = await checkOnce(partnerOrderId);
  if (last.status === "processing") {
    last = {
      status: "failed",
      providerStatus: "booking_timeout",
      percent: last.percent,
      message: "The hotel provider did not return a final booking status before the booking timeout.",
    };
  }
  await applyBookingStatus({
    partnerOrderId,
    status: last.status,
    providerStatus: last.providerStatus,
    errorMessage: last.message,
  });
  return last;
}

export async function runBookingSequence(input: {
  bookHash: string;
  requestId?: string | null;
  userIp?: string;
  email: string;
  phone: string;
  guests: BookingGuest[];
  paymentType: HotelBookingPaymentType;
  comment?: string;
  certificationScenario?: CertificationScenario | null;
}): Promise<{ partnerOrderId: string; orderId: string; result: CheckBookingResult }> {
  const created = await createBookingProcess({
    bookHash: input.bookHash,
    requestId: input.requestId ?? null,
    userIp: input.userIp ?? "",
    certificationScenario: input.certificationScenario ?? null,
  });

  const payment = created.paymentTypes.find((option) => option.type === input.paymentType);
  if (!payment) {
    const message = "The selected hotel payment method is no longer available. Please choose the rate again.";
    await applyBookingStatus({ partnerOrderId: created.partnerOrderId, status: "failed", errorMessage: message });
    throw new HotelBookingError(message);
  }
  if (payment.requiresCard || payment.requiresCvc) {
    const message = "This hotel payment method now requires a card guarantee. Secure card tokenization is not enabled yet.";
    await applyBookingStatus({ partnerOrderId: created.partnerOrderId, status: "failed", errorMessage: message });
    throw new HotelBookingError(message);
  }

  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount < 0 || payment.currencyCode.length !== 3) {
    const message = "The hotel provider returned an invalid booking payment amount.";
    await applyBookingStatus({ partnerOrderId: created.partnerOrderId, status: "failed", errorMessage: message });
    throw new HotelBookingError(message);
  }

  try {
    await startBookingProcess({
      partnerOrderId: created.partnerOrderId,
      email: input.email,
      phone: input.phone,
      guests: input.guests,
      amount,
      currency: payment.currencyCode,
      paymentType: input.paymentType,
      comment: input.comment ?? "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The hotel provider could not start this booking.";
    await applyBookingStatus({
      partnerOrderId: created.partnerOrderId,
      status: "failed",
      providerStatus: errorCode(error) || "start_failed",
      errorMessage: message,
    });
    throw error;
  }

  const result = await checkBookingProcess(created.partnerOrderId);
  return { partnerOrderId: created.partnerOrderId, orderId: created.orderId, result };
}

export async function bookStoredHotelRequest(
  requestId: string,
  expectedPaymentType: HotelBookingPaymentType,
  certificationScenario?: CertificationScenario | null,
  userIp?: string,
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
    if (row.status !== "failed") {
      return { partnerOrderId: row.partner_order_id, orderId: row.order_id ?? null, status: row.status };
    }
  }

  const { data: request, error: requestError } = await db
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError || !request) throw new HotelBookingError("We could not find this hotel booking request.");

  const row = request as Record<string, unknown>;
  const category = String(row["service_category"] ?? "").toLowerCase();
  if (category !== "hotels" && !String(row["service_type"] ?? "").toLowerCase().includes("hotel")) {
    throw new HotelBookingError("This request is not a hotel booking.");
  }

  const bookHash = String(row["hotel_book_hash"] ?? "").trim();
  if (!bookHash) throw new HotelBookingError("This hotel rate no longer has a confirmed booking hash.");
  if (String(row["hotel_payment_type"] ?? "") !== expectedPaymentType) {
    throw new HotelBookingError("The selected hotel payment method does not match this booking action.");
  }
  if (Boolean(row["hotel_payment_requires_card"])) {
    throw new HotelBookingError("This rate requires a card guarantee. Secure card tokenization is not enabled yet.");
  }
  const roomCount = Number(row["hotel_rooms"] ?? 1);
  if (roomCount !== 1) {
    throw new HotelBookingError("Online RateHawk confirmation currently supports one room per booking. Please use one room or contact support for a multi-room stay.");
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
    throw new HotelBookingError(`Please provide traveller details for all ${guestCount} hotel guest(s) before booking.`);
  }

  const email = String(row["email"] ?? "").trim();
  const phone = String(row["phone"] ?? "").trim();
  if (!email || !phone || phone === "—") {
    throw new HotelBookingError("A booking contact email and phone number are required.");
  }

  await db.from("service_requests").update({ booking_status: "processing" }).eq("id", requestId);
  try {
    const booked = await runBookingSequence({
      bookHash,
      requestId,
      email,
      phone,
      guests,
      paymentType: expectedPaymentType,
      certificationScenario: certificationScenario ?? null,
      userIp,
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

export async function cancelStoredHotelRequest(
  requestId: string,
): Promise<{ partnerOrderId: string; cancelled: true }> {
  const db = await admin();
  const { data: booking } = await db
    .from("hotel_bookings")
    .select("partner_order_id, status")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = booking as { partner_order_id?: string; status?: string } | null;
  if (!row?.partner_order_id) throw new HotelBookingError("We could not find a RateHawk booking to cancel.");
  if (row.status !== "ok") throw new HotelBookingError("Only a successfully confirmed hotel booking can be cancelled.");

  await bookingRequest("/hotel/order/cancel/", { partner_order_id: row.partner_order_id });
  await db
    .from("hotel_bookings")
    .update({ provider_status: "cancelled", updated_at: new Date().toISOString() })
    .eq("partner_order_id", row.partner_order_id);
  await db.from("service_requests").update({ booking_status: "cancelled" }).eq("id", requestId);
  await db.from("request_updates").insert({
    request_id: requestId,
    status: "cancelled",
    message: "Hotel booking cancelled with RateHawk.",
  });
  return { partnerOrderId: row.partner_order_id, cancelled: true };
}
