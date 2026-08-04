/**
 * Server-only booking review + checkout preparation helpers.
 *
 * Reads the EXISTING `service_requests` row (flight and hotel columns added in
 * stage 7/8) and prepares a pending row in `payment_transactions`. No payment
 * provider is contacted here — Paystack/Flutterwave arrive in a later stage.
 */
import type { SessionUser } from "../auth.server";
import type { PaymentTransaction } from "./types";

export type BookingReviewKind = "flight" | "hotel" | "other";

export type BookingReview = {
  requestId: string;
  reference: string;
  serviceType: string;
  requestStatus: string;
  paymentStatus: string;
  kind: BookingReviewKind;
  amount: number;
  currency: string;
  /** What the customer is charged through Paystack (converted when needed). */
  chargeAmount: number;
  chargeCurrency: string;
  chargeConverted: boolean;
  bookingStatus: string;
  offerId: string | null;
  pnr: string | null;
  duffelOrderId: string | null;
  holdExpiresAt: string | null;
  paymentDeadline: string | null;
  ticketNumber: string | null;
  passengerCount: number;
  flight: {
    airline: string | null;
    airlineLogoUrl: string | null;
    flightNumber: string | null;
    origin: string | null;
    destination: string | null;
    departureAt: string | null;
    arrivalAt: string | null;
    duration: string | null;
    stops: number | null;
    cabinClass: string | null;
    passengers: number | null;
  } | null;
  hotel: {
    name: string | null;
    imageUrl: string | null;
    location: string | null;
    address: string | null;
    roomType: string | null;
    boardType: string | null;
    cancellationPolicy: string | null;
    checkIn: string | null;
    checkOut: string | null;
    nights: number | null;
    guests: number | null;
    rooms: number | null;
  } | null;
  transaction: PaymentTransaction | null;
};

async function admin() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

function str(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Loads the review payload for a request the signed-in customer owns. */
export async function loadBookingReview(
  user: SessionUser,
  requestId: string,
): Promise<BookingReview | null> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[checkout] loadBookingReview", error.message);
    return null;
  }

  const row = data as Record<string, unknown>;
  const serviceType = String(row["service_type"] ?? "Travel service");
  const category = String(row["service_category"] ?? "").toLowerCase();
  const lowered = serviceType.toLowerCase();

  const isFlight = category === "flights" || lowered.includes("flight");
  const isHotel = category === "hotels" || lowered.includes("hotel");
  const kind: BookingReviewKind = isFlight ? "flight" : isHotel ? "hotel" : "other";

  const flightPrice = num(row["flight_price"]);
  const hotelPrice = num(row["hotel_price"]);
  const quoted = num(row["amount"]) ?? num(row["quoted_amount"]);
  const amount = (isFlight ? flightPrice : isHotel ? hotelPrice : null) ?? quoted ?? 0;
  const currency =
    str(row["flight_currency"]) ?? str(row["hotel_currency"]) ?? str(row["currency"]) ?? "NGN";

  const { listRequestTransactions } = await import("./transactions.server");
  const transactions = await listRequestTransactions(requestId);

  // Paystack can only charge merchant-enabled currencies (NGN). Duffel and
  // RateHawk fares stay in their own currency for the supplier booking.
  const { resolveCustomerCharge } = await import("./currency.server");
  const fx = await resolveCustomerCharge(amount, currency);
  const charge = fx.ok
    ? fx.conversion
    : { amount, currency, converted: false };

  const { count: passengerCount } = await supabase
    .from("booking_passengers")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);

  return {
    requestId,
    bookingStatus: String(row["booking_status"] ?? "pending"),
    offerId: str(row["flight_offer_id"]),
    pnr: str(row["pnr"]) ?? str(row["booking_reference"]),
    duffelOrderId: str(row["duffel_order_id"]),
    holdExpiresAt: str(row["hold_expires_at"]),
    paymentDeadline: str(row["payment_deadline"]) ?? str(row["hold_expires_at"]),
    ticketNumber: str(row["ticket_number"]),
    passengerCount: passengerCount ?? 0,
    reference: String(row["request_reference"] ?? ""),
    serviceType,
    requestStatus: String(row["request_status"] ?? "new_request"),
    paymentStatus: String(row["payment_status"] ?? "pending_payment"),
    kind,
    amount,
    currency,
    chargeAmount: charge.amount,
    chargeCurrency: charge.currency,
    chargeConverted: charge.converted,
    flight: isFlight
      ? {
          airline: str(row["airline"]),
          airlineLogoUrl: str(row["airline_logo_url"]),
          flightNumber: str(row["flight_number"]),
          origin: str(row["flight_origin"]) ?? str(row["origin_country"]),
          destination: str(row["flight_destination"]) ?? str(row["destination_country"]),
          departureAt: str(row["flight_departure_at"]) ?? str(row["travel_date"]),
          arrivalAt: str(row["flight_arrival_at"]),
          duration: str(row["flight_duration"]),
          stops: num(row["flight_stops"]),
          cabinClass: str(row["cabin_class"]),
          passengers: num(row["passenger_count"]) ?? num(row["traveller_count"]),
        }
      : null,
    hotel: isHotel
      ? {
          name: str(row["hotel_name"]) ?? str(row["destination"]),
          imageUrl: str(row["hotel_image_url"]),
          location: str(row["hotel_location"]) ?? str(row["destination_country"]),
          address: str(row["hotel_address"]),
          roomType: str(row["hotel_room_type"]),
          boardType: str(row["hotel_board_type"]),
          cancellationPolicy: str(row["hotel_cancellation_policy"]),
          checkIn: str(row["hotel_check_in"]) ?? str(row["travel_date"]),
          checkOut: str(row["hotel_check_out"]) ?? str(row["return_date"]),
          nights: num(row["hotel_nights"]),
          guests: num(row["hotel_guests"]) ?? num(row["traveller_count"]),
          rooms: num(row["hotel_rooms"]),
        }
      : null,
    transaction: transactions[0] ?? null,
  };
}

/**
 * Creates (or reuses) the pending `manual` transaction for a request so the
 * customer can be taken to the payment preparation page.
 */
export async function prepareCheckout(
  user: SessionUser,
  requestId: string,
): Promise<
  { ok: true; review: BookingReview; transaction: PaymentTransaction } | { ok: false; message: string }
> {
  const review = await loadBookingReview(user, requestId);
  if (!review) return { ok: false, message: "We could not find that booking on your account." };

  // Services priced by a specialist cannot be paid until a price is set.
  if (!review.amount || review.amount <= 0) {
    return {
      ok: false,
      message:
        "Your requested service requires a personalised quotation. Our visa specialist will review your request and provide pricing.",
    };
  }

  const existingPending =
    review.transaction && review.transaction.status === "pending" ? review.transaction : null;

  if (existingPending) return { ok: true, review, transaction: existingPending };

  const { createPendingTransaction } = await import("./transactions.server");
  const { paymentTypeForService } = await import("./types");

  const created = await createPendingTransaction({
    user_id: user.id,
    request_id: requestId,
    amount: review.amount,
    currency: review.currency,
    provider: "manual",
    payment_type: paymentTypeForService(review.serviceType),
  });

  if (!created.ok) return { ok: false, message: created.message };
  return { ok: true, review: { ...review, transaction: created.transaction }, transaction: created.transaction };
}
