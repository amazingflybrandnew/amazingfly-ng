/**
 * Server-only supplier booking adapter for the Visa Hotel Reservation product.
 *
 * The customer pays Amazingfly's service fee first. This adapter then submits
 * the already-selected RateHawk `hotel` (pay-at-property) rate through the
 * certified booking sequence without reclassifying normal hotel checkout.
 */

import { runBookingSequence, type BookingStatus } from "./travel-api/hotel-booking.server";
import { VISA_HOTEL_RESERVATION_CATEGORY } from "./visa-hotel-reservation";

async function admin() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

export async function ensurePaidVisaHotelReservation(
  requestId: string,
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
    const row = existing as {
      partner_order_id: string;
      status: BookingStatus;
      order_id?: string | null;
    };
    if (row.status !== "failed") {
      return {
        partnerOrderId: row.partner_order_id,
        orderId: row.order_id ?? null,
        status: row.status,
      };
    }
  }

  const { data: request, error: requestError } = await db
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    throw new Error("We could not find this visa hotel reservation request.");
  }

  const row = request as Record<string, unknown>;
  const category = String(row["service_category"] ?? "").toLowerCase();
  if (category !== VISA_HOTEL_RESERVATION_CATEGORY) {
    throw new Error("This request is not a visa hotel reservation.");
  }

  if (String(row["payment_status"] ?? "") !== "payment_received") {
    throw new Error("The Amazingfly service fee has not been confirmed yet.");
  }

  if (String(row["hotel_payment_type"] ?? "") !== "hotel") {
    throw new Error("This visa reservation is not using an eligible pay-at-property rate.");
  }
  if (Boolean(row["hotel_payment_requires_card"]) || Boolean(row["hotel_payment_requires_cvc"])) {
    throw new Error("This hotel rate now requires a card guarantee and cannot be used for this visa reservation flow.");
  }

  const roomCount = Number(row["hotel_rooms"] ?? 1);
  if (roomCount !== 1) {
    throw new Error("Visa Hotel Reservation currently supports one room per reservation.");
  }

  const bookHash = String(row["hotel_book_hash"] ?? "").trim();
  if (!bookHash) {
    throw new Error("The selected hotel rate no longer has a valid booking reference. Please choose another rate.");
  }

  const guestCount = Math.max(1, Number(row["hotel_guests"] ?? row["traveller_count"] ?? 1));
  const { data: passengerRows, error: passengerError } = await db
    .from("booking_passengers")
    .select("first_name, last_name, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (passengerError) throw new Error("We could not load the traveller details for this reservation.");

  const guests = ((passengerRows ?? []) as Record<string, unknown>[])
    .map((passenger) => ({
      firstName: String(passenger["first_name"] ?? "").trim(),
      lastName: String(passenger["last_name"] ?? "").trim(),
    }))
    .filter((guest) => guest.firstName && guest.lastName);

  if (guests.length !== guestCount) {
    throw new Error(`Please provide traveller details for all ${guestCount} guest(s) before payment.`);
  }

  const email = String(row["email"] ?? "").trim();
  const phone = String(row["phone"] ?? "").trim();
  if (!email || !phone || phone === "—") {
    throw new Error("A valid reservation contact email and phone number are required.");
  }

  await db
    .from("service_requests")
    .update({ booking_status: "processing", request_status: "processing" })
    .eq("id", requestId);

  try {
    const booked = await runBookingSequence({
      bookHash,
      requestId,
      email,
      phone,
      guests,
      paymentType: "hotel",
      comment: "Visa Hotel Reservation — supplier-backed pay-at-property reservation.",
    });

    await db.from("request_updates").insert({
      request_id: requestId,
      status: booked.result.status === "ok" ? "confirmed" : booked.result.status,
      message:
        booked.result.status === "ok"
          ? "Visa hotel reservation confirmed with the accommodation provider."
          : "Visa hotel reservation submitted to the accommodation provider.",
    });

    return {
      partnerOrderId: booked.partnerOrderId,
      orderId: booked.orderId,
      status: booked.result.status,
    };
  } catch (error) {
    await db
      .from("service_requests")
      .update({ booking_status: "failed", request_status: "processing" })
      .eq("id", requestId);
    await db.from("request_updates").insert({
      request_id: requestId,
      status: "booking_failed",
      message:
        "The Amazingfly service fee was received, but the supplier reservation could not be confirmed. Our team will review the request.",
    });
    throw error;
  }
}
