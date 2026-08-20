/** Flight-only supplier fulfilment after a verified customer payment. */

async function admin() {
  const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
  return createExternalSupabaseAdmin();
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.01;
}

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
  if (row["duffel_order_id"]) return;

  const offerId = String(row["flight_offer_id"] ?? "");
  if (!offerId) throw new Error("This paid flight request has no Duffel offer ID.");

  const { data: passengerRows } = await supabase
    .from("booking_passengers")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (!passengerRows?.length) throw new Error("This paid flight request has no travellers.");

  const { getOfferInfo, createHoldOrder, createInstantOrder } = await import("../travel-api/flights.server");
  const { isVisaFlightReservation } = await import("../visa-flight-reservation");
  const offer = await getOfferInfo(offerId);
  if (!offer) throw new Error("The airline offer expired before ticketing.");

  const storedAmount = Number(row["flight_price"] ?? 0);
  const storedCurrency = String(row["flight_currency"] ?? "").toUpperCase();
  if (
    !closeEnough(offer.totalAmount, storedAmount) ||
    offer.totalCurrency.toUpperCase() !== storedCurrency
  ) {
    throw new Error("The airline changed this fare before ticketing. Manual review is required.");
  }
  if (offer.passengerIds.length !== passengerRows.length) {
    throw new Error("Traveller count no longer matches the airline offer.");
  }

  const passengers = passengerRows.map((raw, index) => {
    const passenger = raw as Record<string, unknown>;
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
      phone_number: String(row["phone"] ?? ""),
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

  // Claim supplier fulfilment before spending Duffel balance. This prevents a
  // Paystack webhook and browser callback from creating two airline orders.
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

    const order = await createInstantOrder({
      offerId,
      passengers,
      amount: offer.totalAmount,
      currency: offer.totalCurrency,
    });
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
      .eq("service_category", "flights")
      .is("duffel_order_id", null);
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "completed",
      message: `Flight confirmed by the airline${order.bookingReference ? ` (PNR ${order.bookingReference})` : ""}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Airline ticketing failed.";
    await supabase
      .from("service_requests")
      .update({ booking_status: "failed", request_status: "processing" })
      .eq("id", requestId)
      .eq("service_category", "flights");
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "processing",
      message: "Payment is confirmed, but airline ticketing needs manual review. Do not pay again.",
    });
    throw new Error(message);
  }
}
