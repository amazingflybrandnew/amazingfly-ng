/**
 * Server-only card-guarantee completion for Visa Hotel Reservation.
 *
 * Sensitive PAN/CVC values are accepted only for the duration of this request,
 * forwarded to ETG Payota tokenization, and never persisted or logged.
 */

import {
  RateHawkApiError,
  RateHawkAuthError,
  isRateHawkSandbox,
  ratehawkRequest,
} from "./ratehawk.server";
import {
  applyBookingStatus,
  checkBookingProcess,
  createBookingProcess,
  type BookingStatus,
} from "./travel-api/hotel-booking.server";
import { VISA_HOTEL_RESERVATION_CATEGORY } from "./visa-hotel-reservation";

const PAYOTA_TOKEN_URL = "https://api.payota.net/api/public/v1/manage/init_partners";

export type VisaHotelGuaranteeCard = {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvc?: string | undefined;
};

export type VisaHotelGuaranteeResult = {
  partnerOrderId: string;
  orderId: string | null;
  status: BookingStatus;
};

function basicAuthHeader(username: string, password: string): string {
  const raw = `${username}:${password}`;
  const encoded =
    typeof btoa === "function"
      ? btoa(raw)
      : Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

function rateHawkCredentials(): { username: string; password: string } {
  const username = process.env["RATEHAWK_KEY_ID"];
  const password = process.env["RATEHAWK_API_TOKEN"];
  if (!username || !password) {
    throw new Error("Hotel booking is not configured yet. Missing RateHawk credentials.");
  }
  return { username, password };
}

async function admin() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

async function tokenizeGuaranteeCard(input: {
  itemId: string;
  firstName: string;
  lastName: string;
  requiresCvc: boolean;
  card: VisaHotelGuaranteeCard;
}): Promise<{ initUuid: string; payUuid: string }> {
  if (isRateHawkSandbox()) {
    throw new Error(
      "Card-guarantee tokenization is not supported by the RateHawk sandbox. Use production RateHawk credentials for this reservation type.",
    );
  }

  const { username, password } = rateHawkCredentials();
  const initUuid = crypto.randomUUID();
  const payUuid = crypto.randomUUID();
  const cardNumber = input.card.cardNumber.replace(/\s+/g, "");

  if (input.requiresCvc && !/^\d{3}$/.test(input.card.cvc ?? "")) {
    throw new Error("This hotel requires the 3-digit card security code for its guarantee.");
  }

  const body: Record<string, unknown> = {
    object_id: input.itemId,
    pay_uuid: payUuid,
    init_uuid: initUuid,
    user_first_name: input.firstName,
    user_last_name: input.lastName,
    is_cvc_required: input.requiresCvc,
    credit_card_data_core: {
      year: input.card.expiryYear,
      card_number: cardNumber,
      card_holder: input.card.cardHolder.trim(),
      month: input.card.expiryMonth,
    },
  };
  if (input.requiresCvc) body["cvc"] = input.card.cvc;

  const response = await fetch(PAYOTA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(username, password),
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Amazingfly/1.0 (ETG card guarantee)",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { status?: string; error?: string | null }
    | null;

  if (!response.ok || payload?.status !== "ok") {
    const providerCode = String(payload?.error ?? "card_tokenization_failed");
    const safeMessage =
      providerCode === "invalid_card_number" || providerCode === "luhn_algorithm_error"
        ? "The guarantee card number was not accepted. Please check it and try again."
        : providerCode === "invalid_cvc"
          ? "The card security code was not accepted. Please check it and try again."
          : providerCode === "invalid_month" || providerCode === "invalid_year"
            ? "The card expiry date was not accepted. Please check it and try again."
            : providerCode === "invalid_card_holder"
              ? "The cardholder name was not accepted. Please check it and try again."
              : "The accommodation provider could not register this guarantee card. Please try another card.";
    throw new Error(safeMessage);
  }

  return { initUuid, payUuid };
}

async function finishBookingWithGuarantee(input: {
  partnerOrderId: string;
  email: string;
  phone: string;
  guests: Array<{ firstName: string; lastName: string }>;
  amount: number;
  currency: string;
  initUuid: string;
  payUuid: string;
}): Promise<void> {
  const lead = input.guests[0];
  if (!lead) throw new Error("At least one traveller is required for the hotel reservation.");

  try {
    const envelope = await ratehawkRequest(
      "/api/b2b/v3/hotel/order/booking/finish/",
      {
        user: {
          email: input.email,
          phone: input.phone,
          comment: "Visa Hotel Reservation — supplier-backed pay-at-property reservation.",
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
          type: "hotel",
          amount: String(input.amount),
          currency_code: input.currency.toUpperCase(),
          init_uuid: input.initUuid,
          pay_uuid: input.payUuid,
        },
      },
    );

    await applyBookingStatus({
      partnerOrderId: input.partnerOrderId,
      status: "started",
      providerStatus: envelope.status ?? "processing",
    });
  } catch (error) {
    const transient =
      error instanceof RateHawkApiError &&
      (error.code === "unknown" || error.code === "timeout" || error.status >= 500);

    if (transient) {
      await applyBookingStatus({
        partnerOrderId: input.partnerOrderId,
        status: "processing",
        providerStatus: error instanceof RateHawkApiError ? error.code : "processing",
        errorMessage: error instanceof Error ? error.message : null,
      });
      return;
    }

    const message =
      error instanceof RateHawkAuthError
        ? "Hotel booking is not configured yet. Missing RateHawk credentials."
        : error instanceof Error
          ? error.message
          : "The accommodation provider could not start this reservation.";
    await applyBookingStatus({
      partnerOrderId: input.partnerOrderId,
      status: "failed",
      providerStatus: error instanceof RateHawkApiError ? error.code : "start_failed",
      errorMessage: message,
    });
    throw new Error(message);
  }
}

export async function completeVisaHotelCardGuarantee(input: {
  requestId: string;
  userId: string;
  card: VisaHotelGuaranteeCard;
}): Promise<VisaHotelGuaranteeResult> {
  const db = await admin();

  const { data: request, error: requestError } = await db
    .from("service_requests")
    .select("*")
    .eq("id", input.requestId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (requestError || !request) {
    throw new Error("We could not find this visa hotel reservation on your account.");
  }

  const row = request as Record<string, unknown>;
  if (String(row["service_category"] ?? "").toLowerCase() !== VISA_HOTEL_RESERVATION_CATEGORY) {
    throw new Error("This request is not a Visa Hotel Reservation.");
  }
  if (String(row["payment_status"] ?? "") !== "payment_received") {
    throw new Error("The ₦15,000 Amazingfly service fee must be confirmed before adding a hotel guarantee card.");
  }
  if (String(row["hotel_payment_type"] ?? "") !== "hotel") {
    throw new Error("This reservation is not using a pay-at-property hotel rate.");
  }

  const requiresCard = Boolean(row["hotel_payment_requires_card"]);
  const requiresCvc = Boolean(row["hotel_payment_requires_cvc"]);
  if (!requiresCard && !requiresCvc) {
    throw new Error("This hotel rate does not require a guarantee card.");
  }

  const { data: existing } = await db
    .from("hotel_bookings")
    .select("partner_order_id, status, order_id")
    .eq("request_id", input.requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const current = existing as {
      partner_order_id: string;
      status: BookingStatus;
      order_id?: string | null;
    };
    if (current.status === "ok") {
      return {
        partnerOrderId: current.partner_order_id,
        orderId: current.order_id ?? null,
        status: "ok",
      };
    }
    if (current.status === "started" || current.status === "processing") {
      const checked = await checkBookingProcess(current.partner_order_id);
      return {
        partnerOrderId: current.partner_order_id,
        orderId: current.order_id ?? null,
        status: checked.status,
      };
    }
  }

  const bookHash = String(row["hotel_book_hash"] ?? "").trim();
  if (!bookHash) {
    throw new Error("The selected hotel rate no longer has a valid booking reference. Please choose another rate.");
  }

  const guestCount = Math.max(1, Number(row["hotel_guests"] ?? row["traveller_count"] ?? 1));
  const { data: passengerRows, error: passengerError } = await db
    .from("booking_passengers")
    .select("first_name, last_name, created_at")
    .eq("request_id", input.requestId)
    .order("created_at", { ascending: true });
  if (passengerError) throw new Error("We could not load the traveller details for this reservation.");

  const guests = ((passengerRows ?? []) as Record<string, unknown>[])
    .map((passenger) => ({
      firstName: String(passenger["first_name"] ?? "").trim(),
      lastName: String(passenger["last_name"] ?? "").trim(),
    }))
    .filter((guest) => guest.firstName && guest.lastName);
  if (guests.length !== guestCount) {
    throw new Error(`Please provide traveller details for all ${guestCount} guest(s) before booking.`);
  }

  const email = String(row["email"] ?? "").trim();
  const phone = String(row["phone"] ?? "").trim();
  if (!email || !phone || phone === "—") {
    throw new Error("A valid reservation contact email and phone number are required.");
  }

  await db
    .from("service_requests")
    .update({ booking_status: "processing", request_status: "processing" })
    .eq("id", input.requestId);

  const created = await createBookingProcess({
    bookHash,
    requestId: input.requestId,
  });
  const payment = created.paymentTypes.find((option) => option.type === "hotel");
  if (!payment) {
    await applyBookingStatus({
      partnerOrderId: created.partnerOrderId,
      status: "failed",
      errorMessage: "The pay-at-property payment method is no longer available.",
    });
    throw new Error("The pay-at-property payment method is no longer available. Please choose another rate.");
  }

  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount < 0 || payment.currencyCode.length !== 3) {
    await applyBookingStatus({
      partnerOrderId: created.partnerOrderId,
      status: "failed",
      errorMessage: "The provider returned an invalid hotel payment amount.",
    });
    throw new Error("The accommodation provider returned invalid payment information.");
  }

  if (!payment.requiresCard && !payment.requiresCvc) {
    // The supplier requirement can legitimately change between prebook and booking form.
    const { startBookingProcess } = await import("./travel-api/hotel-booking.server");
    await startBookingProcess({
      partnerOrderId: created.partnerOrderId,
      email,
      phone,
      guests,
      amount,
      currency: payment.currencyCode,
      paymentType: "hotel",
      comment: "Visa Hotel Reservation — supplier-backed pay-at-property reservation.",
    });
  } else {
    if (!created.itemId) {
      await applyBookingStatus({
        partnerOrderId: created.partnerOrderId,
        status: "failed",
        errorMessage: "The provider did not return the item ID required for card tokenization.",
      });
      throw new Error("The accommodation provider did not return the information needed to register the guarantee card.");
    }

    const lead = guests[0]!;
    const token = await tokenizeGuaranteeCard({
      itemId: created.itemId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      requiresCvc: payment.requiresCvc,
      card: input.card,
    });

    await finishBookingWithGuarantee({
      partnerOrderId: created.partnerOrderId,
      email,
      phone,
      guests,
      amount,
      currency: payment.currencyCode,
      initUuid: token.initUuid,
      payUuid: token.payUuid,
    });
  }

  const result = await checkBookingProcess(created.partnerOrderId);
  await db.from("request_updates").insert({
    request_id: input.requestId,
    status: result.status === "ok" ? "confirmed" : result.status,
    message:
      result.status === "ok"
        ? "Visa hotel reservation confirmed with the accommodation provider."
        : "Visa hotel reservation submitted to the accommodation provider.",
  });

  return {
    partnerOrderId: created.partnerOrderId,
    orderId: created.orderId,
    status: result.status,
  };
}
