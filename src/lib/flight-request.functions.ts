/**
 * Turns a selected Duffel flight offer into a travel request inside the
 * EXISTING request system (public.service_requests). No new request table is
 * introduced, no payment or ticketing happens here — only the request record
 * plus its activity history, so the future booking stage can build on it.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const flightInput = z
  .object({
    offerId: z.string().trim().min(1).max(120),
    airline: z.string().trim().min(1).max(120),
    airlineLogoUrl: z.string().trim().max(500).nullable(),
    flightNumber: z.string().trim().max(40),
    origin: z.string().trim().min(2).max(80),
    destination: z.string().trim().min(2).max(80),
    departureTime: z.string().trim().min(4).max(40),
    arrivalTime: z.string().trim().min(4).max(40),
    duration: z.string().trim().max(40),
    stops: z.number().int().min(0).max(10),
    cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
    passengers: z.number().int().min(1).max(9),
    price: z.number().nonnegative(),
    currency: z.string().trim().min(3).max(6),
  })
  .strict();

export type FlightRequestInput = z.infer<typeof flightInput>;

export type CreateFlightRequestResult =
  | { ok: true; reference: string; requestId: string }
  | { ok: false; reason: "auth" | "error"; message: string };

const SERVICE_TYPE = "Flight Booking";

export const createFlightRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => flightInput.parse(data))
  .handler(async ({ data }): Promise<CreateFlightRequestResult> => {
    const { getAuthenticatedUser } = await import("./auth.server");
    const session = await getAuthenticatedUser();
    if (!session?.user) {
      return {
        ok: false,
        reason: "auth",
        message: "Please sign in so we can save this flight to your account.",
      };
    }
    const user = session.user;

    const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
    const { generateRequestReference } = await import("./request-reference");
    const supabase = createExternalSupabaseAdmin();
    const reference = generateRequestReference();

    // service_requests.service_id is NOT NULL — resolve an existing flight
    // service row before inserting, trying the known slugs then any match.
    const { data: services } = await supabase
      .from("services")
      .select("id, slug, name")
      .in("slug", ["flight-booking", "flights", "flight-reservation", "flight-reservations"]);

    let service =
      (services ?? []).find((row) => row["slug"] === "flight-booking") ??
      (services ?? []).find((row) => row["slug"] === "flights") ??
      (services ?? [])[0];

    if (!service) {
      const { data: fuzzy } = await supabase
        .from("services")
        .select("id, slug, name")
        .ilike("name", "%flight%")
        .limit(1);
      service = (fuzzy ?? [])[0];
    }

    if (!service) {
      console.error("[flight-request] no flight service row found in public.services");
      return {
        ok: false,
        reason: "error",
        message: "Flight booking is not configured yet. Please contact support.",
      };
    }

    const { data: customer } = await supabase
      .from("customers")
      .upsert(
        {
          full_name: user.full_name || user.email,
          email: user.email.toLowerCase(),
          phone: user.phone ?? null,
        },
        { onConflict: "email" },
      )
      .select("id")
      .maybeSingle();

    const summary = [
      `${data.airline} ${data.flightNumber}`.trim(),
      `${data.origin} → ${data.destination}`,
      `${new Date(data.departureTime).toISOString().slice(0, 16).replace("T", " ")} UTC`,
      `${data.duration} · ${data.stops === 0 ? "non-stop" : `${data.stops} stop(s)`}`,
      `${data.cabinClass.replace("_", " ")} · ${data.passengers} passenger(s)`,
      `${data.currency} ${data.price.toLocaleString()}`,
      `Duffel offer: ${data.offerId}`,
    ].join("\n");

    const baseRow: Record<string, unknown> = {
      request_reference: reference,
      service_id: service?.id ?? null,
      customer_id: customer?.id ?? null,
      user_id: user.id,
      service_type: SERVICE_TYPE,
      origin_country: data.origin,
      destination_country: data.destination,
      destination: data.destination,
      travel_date: data.departureTime.slice(0, 10),
      traveller_count: data.passengers,
      full_name: user.full_name || user.email,
      email: user.email,
      phone: user.phone ?? "—",
      preferred_contact: "email",
      request_details: `Flight selected from live search.\n\n${summary}`,
      consent_to_contact: true,
    };

    const flightRow: Record<string, unknown> = {
      ...baseRow,
      service_category: "flights",
      flight_offer_id: data.offerId,
      airline: data.airline,
      airline_logo_url: data.airlineLogoUrl,
      flight_number: data.flightNumber,
      flight_origin: data.origin,
      flight_destination: data.destination,
      flight_departure_at: data.departureTime,
      flight_arrival_at: data.arrivalTime,
      flight_duration: data.duration,
      flight_stops: data.stops,
      cabin_class: data.cabinClass,
      passenger_count: data.passengers,
      flight_price: data.price,
      flight_currency: data.currency,
      booking_status: "not_booked",
    };

    let { data: request, error } = await supabase
      .from("service_requests")
      .insert(flightRow)
      .select("id")
      .maybeSingle();

    // 42703 / PGRST204 = flight columns not migrated yet — fall back to the
    // base row so the customer never loses their selection.
    if (error?.code === "42703" || error?.code === "PGRST204") {
      ({ data: request, error } = await supabase
        .from("service_requests")
        .insert(baseRow)
        .select("id")
        .maybeSingle());
    }

    if (error || !request) {
      console.error("[flight-request]", error?.message);
      return {
        ok: false,
        reason: "error",
        message: error?.message ?? "We could not save this flight request.",
      };
    }

    const requestId = String(request["id"]);

    // Activity history entry.
    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "new_request",
      message: `Customer selected ${data.airline} flight ${data.origin} → ${data.destination}`,
    });

    const { notifyRequestReceived } = await import("./notifications.server");
    await notifyRequestReceived({
      requestId,
      userId: user.id,
      reference,
      fullName: user.full_name || user.email,
      email: user.email,
      serviceLabel: SERVICE_TYPE,
      originCountry: data.origin,
      destinationCountry: data.destination,
      travelDate: data.departureTime.slice(0, 10),
      documentCount: 0,
    });

    return { ok: true, reference, requestId };
  });
