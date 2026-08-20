/**
 * Server-only "Book on Hold" logic.
 *
 * Creates a Duffel `hold` order (no payment) for a flight request the customer
 * owns, then records the PNR / order id / payment deadline on the EXISTING
 * `service_requests` row.
 */
import type { SessionUser } from "../auth.server";

export type HoldResult =
  | {
      ok: true;
      bookingReference: string | null;
      orderId: string;
      paymentDeadline: string | null;
    }
  | { ok: false; message: string };

async function admin() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

/** Default airline hold window when Duffel does not return a deadline. */
function fallbackDeadline(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export async function holdFlightBooking(
  user: SessionUser,
  requestId: string,
): Promise<HoldResult> {
  const supabase = await admin();
  const { data } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();

  const row = (data as Record<string, unknown> | null) ?? null;
  if (!row) return { ok: false, message: "We could not find that booking on your account." };

  if (String(row["service_category"] ?? "").toLowerCase() !== "flights") {
    return { ok: false, message: "Book on Hold is available only for flight requests." };
  }

  const offerId = row["flight_offer_id"] ? String(row["flight_offer_id"]) : "";
  if (!offerId) {
    return { ok: false, message: "Holding is only available on live airline flight offers." };
  }

  const { loadPassengers } = await import("./passengers.server");
  const bundle = await loadPassengers(user, requestId);
  if (!bundle || bundle.passengers.length === 0) {
    return { ok: false, message: "Please add traveller details before holding this reservation." };
  }

  const { getOfferInfo, createHoldOrder } = await import("../travel-api/flights.server");

  let info;
  try {
    info = await getOfferInfo(offerId);
  } catch (error) {
    console.error("[hold] offer info", error);
    return { ok: false, message: "The airline could not confirm this fare. Please pay now instead." };
  }

  if (!info) return { ok: false, message: "This airline offer has expired. Please search again." };
  if (!info.supportsHold) {
    return { ok: false, message: "This airline requires immediate payment for this fare." };
  }
  if (info.passengerIds.length < bundle.passengers.length) {
    return { ok: false, message: "Traveller count no longer matches the airline offer." };
  }

  const contact = bundle.contact;
  const { normalizeBookingPhone } = await import("./phone");
  let phoneNumber: string;
  try {
    phoneNumber = normalizeBookingPhone(
      contact?.phone ?? user.phone,
      contact?.country ?? user.nationality,
    );
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Enter a valid phone number." };
  }
  const passengers = bundle.passengers.map((passenger, index) => ({
    id: info.passengerIds[index] as string,
    title: passenger.title,
    given_name: passenger.firstName,
    family_name: passenger.lastName,
    born_on: passenger.dateOfBirth,
    gender: passenger.gender,
    email: contact?.email ?? user.email,
    phone_number: phoneNumber,
  }));

  let order;
  try {
    order = await createHoldOrder({
      offerId,
      passengers,
      amount: Number(row["flight_price"] ?? 0),
      currency: String(row["flight_currency"] ?? "NGN"),
    });
  } catch (error) {
    console.error("[hold] create order", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The airline could not hold this reservation. Please pay now instead.",
    };
  }

  const deadline = order.paymentRequiredBy ?? info.paymentRequiredBy ?? fallbackDeadline();

  const update: Record<string, unknown> = {
    booking_status: "on_hold",
    booking_reference: order.bookingReference,
    pnr: order.bookingReference,
    duffel_order_id: order.orderId,
    airline_reference: order.bookingReference,
    hold_expires_at: deadline,
    payment_deadline: deadline,
  };

  let { error } = await supabase.from("service_requests").update(update).eq("id", requestId);
  if (error?.code === "42703" || error?.code === "PGRST204") {
    ({ error } = await supabase
      .from("service_requests")
      .update({ booking_status: "on_hold", booking_reference: order.bookingReference })
      .eq("id", requestId));
  }
  if (error) console.error("[hold] persist", error.message);

  await supabase.from("request_updates").insert({
    request_id: requestId,
    status: "on_hold",
    message: `Airline reservation held${order.bookingReference ? ` (PNR ${order.bookingReference})` : ""}. Payment required by ${deadline}.`,
  });

  return {
    ok: true,
    bookingReference: order.bookingReference,
    orderId: order.orderId,
    paymentDeadline: deadline,
  };
}
