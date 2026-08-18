import type { SessionUser } from "./auth.server";
import { VISA_HOTEL_RESERVATION_CATEGORY } from "./visa-hotel-reservation";

export type VisaHotelReservationDocument = {
  requestId: string;
  reference: string;
  paymentStatus: string;
  bookingStatus: string;
  ready: boolean;
  issuedAt: string | null;
  contact: {
    fullName: string;
    email: string;
    phone: string;
  };
  travellers: Array<{
    title: string;
    firstName: string;
    middleName: string;
    lastName: string;
    nationality: string;
  }>;
  hotel: {
    name: string;
    address: string;
    location: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    roomType: string;
    boardType: string;
    cancellationPolicy: string;
    accommodationAmount: number;
    accommodationCurrency: string;
    paymentType: string;
  };
  supplier: {
    partnerOrderId: string | null;
    orderId: string | null;
    providerReference: string | null;
    providerStatus: string | null;
    status: string | null;
  };
  serviceFee: {
    amount: number;
    currency: string;
    transactionReference: string | null;
    paidAt: string | null;
  };
};

async function admin() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function optionalText(value: unknown): string | null {
  const valueText = text(value).trim();
  return valueText ? valueText : null;
}

export async function loadVisaHotelReservationDocument(
  user: SessionUser,
  requestId: string,
): Promise<VisaHotelReservationDocument | null> {
  const db = await admin();
  const { data: request, error } = await db
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .eq("service_category", VISA_HOTEL_RESERVATION_CATEGORY)
    .maybeSingle();

  if (error || !request) {
    if (error) console.error("[visa-hotel-document] request", error.message);
    return null;
  }

  const [passengerResult, bookingResult, paymentResult] = await Promise.all([
    db
      .from("booking_passengers")
      .select("title, first_name, middle_name, last_name, nationality, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
    db
      .from("hotel_bookings")
      .select("partner_order_id, order_id, provider_reference, provider_status, status, updated_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("payment_transactions")
      .select("transaction_reference, amount, currency, status, paid_at")
      .eq("request_id", requestId)
      .eq("status", "successful")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (passengerResult.error) {
    console.error("[visa-hotel-document] passengers", passengerResult.error.message);
  }
  if (bookingResult.error) {
    console.error("[visa-hotel-document] booking", bookingResult.error.message);
  }
  if (paymentResult.error) {
    console.error("[visa-hotel-document] payment", paymentResult.error.message);
  }

  const row = request as Record<string, unknown>;
  const booking = (bookingResult.data as Record<string, unknown> | null) ?? null;
  const payment = (paymentResult.data as Record<string, unknown> | null) ?? null;
  const paymentStatus = text(row["payment_status"] || "pending_payment");
  const bookingStatus = text(row["booking_status"] || "not_booked");
  const supplierConfirmed = bookingStatus === "confirmed" || text(booking?.["status"]) === "ok";
  const paymentConfirmed = paymentStatus === "payment_received" && text(payment?.["status"]) === "successful";

  return {
    requestId,
    reference: text(row["request_reference"]),
    paymentStatus,
    bookingStatus,
    ready: supplierConfirmed && paymentConfirmed,
    issuedAt: supplierConfirmed
      ? optionalText(row["hotel_booked_at"]) ?? optionalText(booking?.["updated_at"])
      : null,
    contact: {
      fullName: text(row["full_name"]),
      email: text(row["email"]),
      phone: text(row["phone"]).replace(/^—$/, ""),
    },
    travellers: ((passengerResult.data ?? []) as Record<string, unknown>[]).map((passenger) => ({
      title: text(passenger["title"]),
      firstName: text(passenger["first_name"]),
      middleName: text(passenger["middle_name"]),
      lastName: text(passenger["last_name"]),
      nationality: text(passenger["nationality"]),
    })),
    hotel: {
      name: text(row["hotel_name"]),
      address: text(row["hotel_address"]),
      location: text(row["hotel_location"]),
      checkIn: text(row["hotel_check_in"] ?? row["travel_date"]),
      checkOut: text(row["hotel_check_out"] ?? row["return_date"]),
      nights: Number(row["hotel_nights"] ?? 1),
      guests: Number(row["hotel_guests"] ?? row["traveller_count"] ?? 1),
      roomType: text(row["hotel_room_type"] || "Room"),
      boardType: text(row["hotel_board_type"] || "Room only"),
      cancellationPolicy: text(row["hotel_cancellation_policy"] || "Supplier cancellation terms apply."),
      accommodationAmount: Number(row["hotel_price"] ?? 0),
      accommodationCurrency: text(row["hotel_currency"] || "USD"),
      paymentType: text(row["hotel_payment_type"] || "hotel"),
    },
    supplier: {
      partnerOrderId: optionalText(booking?.["partner_order_id"]),
      orderId: optionalText(booking?.["order_id"]) ?? optionalText(row["hotel_booking_reference"]),
      providerReference: optionalText(booking?.["provider_reference"]),
      providerStatus: optionalText(booking?.["provider_status"]),
      status: optionalText(booking?.["status"]),
    },
    serviceFee: {
      amount: Number(payment?.["amount"] ?? row["amount"] ?? 0),
      currency: text(payment?.["currency"] ?? row["currency"] ?? "NGN"),
      transactionReference: optionalText(payment?.["transaction_reference"]),
      paidAt: optionalText(payment?.["paid_at"]) ?? optionalText(row["paid_at"]),
    },
  };
}
