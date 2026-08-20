/**
 * Server-only booking review + checkout preparation helpers.
 * Reads the existing service_requests row and prepares checkout data.
 */
import type { SessionUser } from "../auth.server";
import {
  VISA_HOTEL_RESERVATION_CATEGORY,
  isVisaHotelReservationServiceType,
} from "../visa-hotel-reservation";
import type { PaymentProvider, PaymentTransaction } from "./types";
import { isVisaFlightReservation } from "../visa-flight-reservation";
import {
  flightAddOnTotal,
  normalizeFlightAddOns,
  type FlightAddOnId,
} from "../booking/flight-addons";

export type BookingReviewKind = "flight" | "hotel" | "other";
export type HotelReviewPaymentType = "deposit" | "hotel" | "now";

export type BookingReview = {
  requestId: string;
  reference: string;
  serviceType: string;
  catalogueId: string | null;
  requestStatus: string;
  paymentStatus: string;
  kind: BookingReviewKind;
  amount: number;
  currency: string;
  chargeAmount: number;
  chargeCurrency: string;
  chargeConverted: boolean;
  selectedAddOns: FlightAddOnId[];
  addOnTotal: number;
  requiresQuote: boolean;
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
    paymentType: HotelReviewPaymentType | null;
    paymentRequiresCard: boolean;
    paymentRequiresCvc: boolean;
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

function hotelPaymentType(value: unknown): HotelReviewPaymentType | null {
  return value === "deposit" || value === "hotel" || value === "now" ? value : null;
}

export async function loadBookingReview(
  user: SessionUser,
  requestId: string,
): Promise<BookingReview | null> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[checkout] loadBookingReview", error.message);
    return null;
  }

  const owner = (data as Record<string, unknown>)["user_id"];
  const rowEmail = String((data as Record<string, unknown>)["email"] ?? "").toLowerCase();
  const ownsById = owner ? String(owner) === user.id : false;
  const ownsByEmail = !owner && rowEmail.length > 0 && rowEmail === user.email.toLowerCase();
  if (!ownsById && !ownsByEmail) return null;

  if (ownsByEmail) {
    const { error: claimError } = await supabase
      .from("service_requests")
      .update({ user_id: user.id })
      .eq("id", requestId)
      .is("user_id", null);
    if (claimError) console.error("[checkout] claim request", claimError.message);
    await supabase
      .from("payment_transactions")
      .update({ user_id: user.id })
      .eq("request_id", requestId)
      .is("user_id", null);
  }

  const row = data as Record<string, unknown>;
  const serviceType = String(row["service_type"] ?? "Travel service");
  const category = String(row["service_category"] ?? "").toLowerCase();
  const lowered = serviceType.toLowerCase();
  const isVisaHotelReservation = category === VISA_HOTEL_RESERVATION_CATEGORY;
  const catalogueId = str(row["catalogue_id"]);
  const isFlight = category === "flights" || lowered.includes("flight");
  const isVisaFlight = isFlight && isVisaFlightReservation(catalogueId);
  const isHotel =
    category === "hotels" || isVisaHotelReservation || lowered.includes("hotel");
  const kind: BookingReviewKind = isFlight ? "flight" : isHotel ? "hotel" : "other";

  const flightPrice = num(row["flight_price"]);
  const hotelPrice = num(row["hotel_price"]);
  const quoted = num(row["amount"]) ?? num(row["quoted_amount"]);
  const amount = isVisaHotelReservation || isVisaFlight
    ? quoted ?? 0
    : (isFlight ? flightPrice : isHotel ? hotelPrice : null) ?? quoted ?? 0;
  const currency = isVisaHotelReservation || isVisaFlight
    ? str(row["currency"]) ?? "NGN"
    : str(row["flight_currency"]) ??
      str(row["hotel_currency"]) ??
      str(row["currency"]) ??
      "NGN";

  const { listRequestTransactions } = await import("./transactions.server");
  const transactions = await listRequestTransactions(requestId);

  const { resolveCustomerCharge } = await import("./currency.server");
  const fx = await resolveCustomerCharge(amount, currency, kind === "flight");
  const charge = fx.ok ? fx.conversion : { amount, currency, converted: false };
  const selectedAddOns =
    kind === "flight" && !isVisaFlight ? normalizeFlightAddOns(row["flight_add_ons"]) : [];
  const addOnTotal = flightAddOnTotal(selectedAddOns);

  const { count: passengerCount } = await supabase
    .from("booking_passengers")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);

  return {
    requestId,
    requiresQuote: Boolean(row["requires_quote"]),
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
    catalogueId,
    requestStatus: String(row["request_status"] ?? "new_request"),
    paymentStatus: String(row["payment_status"] ?? "pending_payment"),
    kind,
    amount,
    currency,
    chargeAmount: charge.amount + addOnTotal,
    chargeCurrency: charge.currency,
    chargeConverted: charge.converted,
    selectedAddOns,
    addOnTotal,
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
          paymentType: hotelPaymentType(row["hotel_payment_type"]),
          paymentRequiresCard: Boolean(row["hotel_payment_requires_card"]),
          paymentRequiresCvc: Boolean(row["hotel_payment_requires_cvc"]),
        }
      : null,
    transaction: transactions[0] ?? null,
  };
}

export async function prepareCheckout(
  user: SessionUser,
  requestId: string,
  options?: { provider?: PaymentProvider },
): Promise<
  { ok: true; review: BookingReview; transaction: PaymentTransaction } | { ok: false; message: string }
> {
  const review = await loadBookingReview(user, requestId);
  if (!review) return { ok: false, message: "We could not find that booking on your account." };

  if (
    review.kind === "hotel" &&
    review.hotel?.paymentType === "hotel" &&
    !isVisaHotelReservationServiceType(review.serviceType)
  ) {
    return {
      ok: false,
      message: "This hotel rate is reserved directly and paid at the property; online payment is not required.",
    };
  }

  if (review.requiresQuote || !review.chargeAmount || review.chargeAmount <= 0) {
    return {
      ok: false,
      message:
        "Your requested service requires a personalised quotation. Our specialist will review your request and provide pricing.",
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
    amount: review.chargeAmount,
    currency: review.chargeCurrency,
    provider: options?.provider ?? "manual",
    payment_type: paymentTypeForService(review.serviceType),
  });

  if (!created.ok) return { ok: false, message: created.message };
  return { ok: true, review: { ...review, transaction: created.transaction }, transaction: created.transaction };
}
