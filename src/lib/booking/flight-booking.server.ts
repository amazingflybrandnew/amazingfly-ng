/**
 * Flight-only supplier fulfilment.
 *
 * Funding model: "collect from customer -> fund Duffel -> issue".
 *  - After a verified customer payment we place a FREE airline HOLD (no Duffel
 *    balance spent). This locks the fare/seat and gives a PNR, while the money
 *    the customer paid stays with us until we top up Duffel.
 *  - An admin then tops up the Duffel balance and issues the ticket explicitly
 *    via issuePaidFlightTicket() — which pays the held order from balance.
 *  - Tickets are NEVER issued automatically from balance on payment, so a
 *    customer can never be charged for a ticket we cannot fund.
 *
 * Visa flight reservations remain a genuine, intentionally-unpaid hold.
 */

import type { FlightOfferInfo } from "../travel-api/flight-offer.types";

async function admin() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.01;
}

type PassengerRow = Record<string, unknown>;

/** Build the Duffel passenger payload from stored travellers + the live offer. */
async function buildPassengers(
  row: Record<string, unknown>,
  passengerRows: PassengerRow[],
  offer: FlightOfferInfo,
) {
  const { normalizeBookingPhone } = await import("./phone");
  const phoneNumber = normalizeBookingPhone(
    row["phone"],
    row["contact_country"] ?? passengerRows[0]?.["passport_country"],
  );

  return passengerRows.map((passenger, index) => {
    const passportNumber = String(passenger["passport_number"] ?? "");
    const passportCountry = String(passenger["passport_country"] ?? "").toUpperCase();
    const passportExpiry = String(passenger["passport_expiry"] ?? "").slice(0, 10);
    if (offer.passportRequired && (!passportNumber || !passportCountry || !passportExpiry)) {
      throw new Error("The airline requires complete passport details before ticketing.");
    }

    return {
      id: offer.passengerIds[index] as string,
      title: String(passenger["title"] ?? "mr"),
      given_name: String(passenger["first_name"] ?? ""),
      family_name: String(passenger["last_name"] ?? ""),
      born_on: String(passenger["date_of_birth"] ?? "").slice(0, 10),
      gender: String(passenger["gender"] ?? "m"),
      email: String(row["email"] ?? ""),
      phone_number: phoneNumber,
      ...(passportNumber && passportCountry && passportExpiry
        ? {
            identity_documents: [
              {
                type: "passport" as const,
                unique_identifier: passportNumber,
                issuing_country_code: passportCountry,
                expires_on: passportExpiry,
              },
            ],
          }
        : {}),
    };
  });
}

/**
 * Called after a verified customer payment. For a normal flight this places a
 * free airline HOLD (no balance spent) and leaves the booking "awaiting_ticketing"
 * for an admin to issue after funding Duffel. It never spends Duffel balance.
 */
export async function ensurePaidFlightBooking(requestId: string): Promise<void> {
  const supabase = await admin();
  const { data } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  const row = (data as Record<string, unknown> | null) ?? null;

  // This hard boundary prevents flight fulfilment from ever touching hotels.
  if (!row || String(row["service_category"] ?? "").toLowerCase() !== "flights") return;
  if (String(row["payment_status"] ?? "") !== "payment_received") return;

  const { isVisaFlightReservation } = await import("../visa-flight-reservation");

  // Already has an airline order (hold placed, or visa reservation): nothing to
  // do here. Issuance happens explicitly via issuePaidFlightTicket().
  if (String(row["duffel_order_id"] ?? "")) return;

  // Already past the payment hand-off (e.g. a non-holdable fare already marked
  // awaiting_ticketing, or an in-flight/confirmed booking): never reprocess, so
  // a duplicate callback + webhook can't flip a good booking to "failed".
  if (["awaiting_ticketing", "ticketing", "confirmed"].includes(String(row["booking_status"] ?? ""))) {
    return;
  }

  const offerId = String(row["flight_offer_id"] ?? "");
  if (!offerId) throw new Error("This paid flight request has no Duffel offer ID.");

  const { data: passengerRows } = await supabase
    .from("booking_passengers")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (!passengerRows?.length) throw new Error("This paid flight request has no travellers.");

  const { getOfferInfo, createHoldOrder } = await import("../travel-api/flights.server");
  const offer = await getOfferInfo(offerId);
  if (!offer) throw new Error("The airline offer expired before it could be held.");

  const storedAmount = Number(row["flight_price"] ?? 0);
  const storedCurrency = String(row["flight_currency"] ?? "").toUpperCase();
  if (
    !closeEnough(offer.totalAmount, storedAmount) ||
    offer.totalCurrency.toUpperCase() !== storedCurrency
  ) {
    throw new Error("The airline changed this fare before it could be held. Manual review is required.");
  }
  if (offer.passengerIds.length !== passengerRows.length) {
    throw new Error("Traveller count no longer matches the airline offer.");
  }

  const passengers = await buildPassengers(row, passengerRows as PassengerRow[], offer);

  // Claim fulfilment before creating any airline order. This prevents a Paystack
  // webhook and browser callback from racing to create two orders.
  const { data: claimed, error: claimError } = await supabase
    .from("service_requests")
    .update({ booking_status: "ticketing" })
    .eq("id", requestId)
    .eq("service_category", "flights")
    .is("duffel_order_id", null)
    .neq("booking_status", "ticketing")
    .select("id");
  if (claimError) throw new Error("Could not safely start airline fulfilment.");
  if (!claimed?.length) return;

  try {
    // Visa flight reservation: a genuine, intentionally-unpaid temporary hold.
    if (isVisaFlightReservation(row["catalogue_id"])) {
      if (!offer.supportsHold) throw new Error("The airline no longer permits a temporary hold.");
      const held = await createHoldOrder({
        offerId,
        passengers,
        amount: offer.totalAmount,
        currency: offer.totalCurrency,
      });
      const deadline = held.paymentRequiredBy ?? offer.paymentRequiredBy;
      await supabase
        .from("service_requests")
        .update({
          booking_status: "on_hold",
          request_status: "completed",
          duffel_order_id: held.orderId,
          booking_reference: held.bookingReference,
          pnr: held.bookingReference,
          airline_reference: held.bookingReference,
          hold_expires_at: deadline,
          payment_deadline: deadline,
          booking_confirmed_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("service_category", "flights")
        .eq("catalogue_id", "visa-flight-reservation")
        .is("duffel_order_id", null);
      await supabase.from("request_updates").insert({
        request_id: requestId,
        status: "completed",
        message: `Genuine temporary airline reservation created${held.bookingReference ? ` (PNR ${held.bookingReference})` : ""}${deadline ? `; valid until ${deadline}` : ""}. This is not a paid ticket.`,
      });
      return;
    }

    // Normal paid flight: place a free HOLD now; issue the ticket later, after
    // funding Duffel, via issuePaidFlightTicket(). No balance is spent here.
    if (offer.supportsHold) {
      const held = await createHoldOrder({
        offerId,
        passengers,
        amount: offer.totalAmount,
        currency: offer.totalCurrency,
      });
      const deadline = held.paymentRequiredBy ?? offer.paymentRequiredBy;
      await supabase
        .from("service_requests")
        .update({
          booking_status: "awaiting_ticketing",
          request_status: "processing",
          duffel_order_id: held.orderId,
          booking_reference: held.bookingReference,
          pnr: held.bookingReference,
          airline_reference: held.bookingReference,
          hold_expires_at: deadline,
          payment_deadline: deadline,
        })
        .eq("id", requestId)
        .eq("service_category", "flights")
        .is("duffel_order_id", null);
      await supabase.from("request_updates").insert({
        request_id: requestId,
        status: "processing",
        message: `Payment received. Your seat and fare are reserved${held.bookingReference ? ` (PNR ${held.bookingReference})` : ""} and your e-ticket is being issued — you'll receive it shortly.${deadline ? ` (Reservation held until ${deadline}.)` : ""}`,
      });
      return;
    }

    // Fare does not allow a hold: mark for prompt manual issuance. No order was
    // created and the offer may expire quickly, so this needs admin attention.
    await supabase
      .from("service_requests")
      .update({ booking_status: "awaiting_ticketing", request_status: "processing" })
      .eq("id", requestId)
      .eq("service_category", "flights")
      .is("duffel_order_id", null);
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "processing",
      message:
        "Payment received. Your e-ticket is being issued — you'll receive it shortly. (This fare must be issued promptly by our team.)",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Airline hold failed.";
    await supabase
      .from("service_requests")
      .update({ booking_status: "failed", request_status: "processing" })
      .eq("id", requestId)
      .eq("service_category", "flights");
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "processing",
      message: "Payment is confirmed, but reserving the airline seat needs manual review. Do not pay again.",
    });
    throw new Error(message);
  }
}

export type IssueFlightResult =
  | { ok: true; bookingReference: string | null; ticketNumber: string | null }
  | { ok: false; message: string };

/**
 * Admin action: issue the ticket for a paid flight AFTER the Duffel balance has
 * been funded. Pays the existing hold from balance, or (for a non-holdable fare)
 * places and pays an instant order. Idempotent and race-safe.
 */
export async function issuePaidFlightTicket(requestId: string): Promise<IssueFlightResult> {
  const supabase = await admin();
  const { data } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  const row = (data as Record<string, unknown> | null) ?? null;

  if (!row || String(row["service_category"] ?? "").toLowerCase() !== "flights") {
    return { ok: false, message: "This request is not a flight booking." };
  }
  if (String(row["payment_status"] ?? "") !== "payment_received") {
    return { ok: false, message: "This flight has not been paid for yet." };
  }
  const status = String(row["booking_status"] ?? "");
  if (status === "confirmed") {
    return { ok: false, message: "This ticket has already been issued." };
  }
  if (!["awaiting_ticketing", "failed", "on_hold"].includes(status)) {
    return { ok: false, message: `This flight is not ready to issue (status: ${status || "unknown"}).` };
  }

  // Atomically claim issuance so a double click / concurrent call cannot
  // double-spend Duffel balance.
  const { data: claimed } = await supabase
    .from("service_requests")
    .update({ booking_status: "ticketing" })
    .eq("id", requestId)
    .eq("service_category", "flights")
    .in("booking_status", ["awaiting_ticketing", "failed", "on_hold"])
    .select("id");
  if (!claimed?.length) {
    return { ok: false, message: "This ticket is already being issued. Please refresh in a moment." };
  }

  const revert = async (message: string) => {
    await supabase
      .from("service_requests")
      .update({ booking_status: "awaiting_ticketing" })
      .eq("id", requestId)
      .eq("service_category", "flights")
      .eq("booking_status", "ticketing");
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "processing",
      message: `Ticket issuance attempt did not complete: ${message}`.slice(0, 480),
    });
  };

  try {
    const { getOfferInfo, payHeldOrder, createInstantOrder } = await import(
      "../travel-api/flights.server"
    );

    const existingOrderId = String(row["duffel_order_id"] ?? "");
    let order: { orderId: string; bookingReference: string | null; ticketNumbers: string[] };

    if (existingOrderId) {
      // A hold already exists: pay it from the (now funded) Duffel balance.
      order = await payHeldOrder(existingOrderId);
    } else {
      // Non-holdable fare: re-price the stored offer and place an instant order.
      const offerId = String(row["flight_offer_id"] ?? "");
      if (!offerId) throw new Error("This flight has no airline offer to issue.");
      const offer = await getOfferInfo(offerId);
      if (!offer) {
        throw new Error("The airline offer has expired. Re-quote this flight before issuing.");
      }
      const storedAmount = Number(row["flight_price"] ?? 0);
      const storedCurrency = String(row["flight_currency"] ?? "").toUpperCase();
      if (
        !closeEnough(offer.totalAmount, storedAmount) ||
        offer.totalCurrency.toUpperCase() !== storedCurrency
      ) {
        throw new Error("The airline fare changed. Re-quote this flight before issuing.");
      }
      const { data: passengerRows } = await supabase
        .from("booking_passengers")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (!passengerRows?.length) throw new Error("This flight has no travellers.");
      if (offer.passengerIds.length !== passengerRows.length) {
        throw new Error("Traveller count no longer matches the airline offer.");
      }
      const passengers = await buildPassengers(row, passengerRows as PassengerRow[], offer);
      order = await createInstantOrder({
        offerId,
        passengers,
        amount: offer.totalAmount,
        currency: offer.totalCurrency,
      });
    }

    const now = new Date().toISOString();
    const ticketNumber = order.ticketNumbers.join(", ") || null;
    await supabase
      .from("service_requests")
      .update({
        booking_status: "confirmed",
        request_status: "completed",
        duffel_order_id: order.orderId,
        booking_reference: order.bookingReference,
        pnr: order.bookingReference,
        airline_reference: order.bookingReference,
        ticket_number: ticketNumber,
        booking_confirmed_at: now,
      })
      .eq("id", requestId)
      .eq("service_category", "flights");
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "completed",
      message: `Flight ticket issued${order.bookingReference ? ` (PNR ${order.bookingReference})` : ""}${ticketNumber ? `, e-ticket ${ticketNumber}` : ""}.`,
    });
    return { ok: true, bookingReference: order.bookingReference, ticketNumber };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Airline ticketing failed.";
    await revert(message);
    return { ok: false, message };
  }
}
