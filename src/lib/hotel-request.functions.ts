/**
 * Turns a selected RateHawk hotel stay into a travel request inside the
 * EXISTING request system (public.service_requests). No new request table is
 * introduced, no payment or booking happens here — only the request record
 * plus its activity history, so the future booking stage can build on it.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const hotelInput = z
  .object({
    hotelId: z.string().trim().min(1).max(160),
    hotelName: z.string().trim().min(1).max(200),
    hotelImage: z.string().trim().max(600).nullable(),
    rating: z.number().min(0).max(5),
    location: z.string().trim().max(160),
    address: z.string().trim().max(400),
    checkInDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOutDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    nights: z.number().int().min(1).max(60).nullable(),
    guests: z.number().int().min(1).max(30),
    rooms: z.number().int().min(1).max(10),
    roomType: z.string().trim().max(160).nullable(),
    boardType: z.string().trim().max(120).nullable(),
    cancellationPolicy: z.string().trim().max(400).nullable(),
    price: z.number().nonnegative(),
    currency: z.string().trim().min(3).max(6),
    bookHash: z.string().trim().max(600).nullable().optional(),
  })
  .strict();

export type HotelRequestInput = z.infer<typeof hotelInput>;

export type CreateHotelRequestResult =
  | { ok: true; reference: string; requestId: string }
  | { ok: false; reason: "auth" | "error"; message: string };

const SERVICE_TYPE = "Hotel Booking";

export const createHotelRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => hotelInput.parse(data))
  .handler(async ({ data }): Promise<CreateHotelRequestResult> => {
    const { getAuthenticatedUser } = await import("./auth.server");
    const session = await getAuthenticatedUser();
    if (!session?.user) {
      return {
        ok: false,
        reason: "auth",
        message: "Please sign in so we can save this hotel stay to your account.",
      };
    }
    const user = session.user;

    const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
    const { generateRequestReference } = await import("./request-reference");
    const supabase = createExternalSupabaseAdmin();
    const reference = generateRequestReference();

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("slug", "hotel-booking")
      .maybeSingle();

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
      data.hotelName,
      [data.location, data.address].filter(Boolean).join(" · "),
      `${data.checkInDate} → ${data.checkOutDate}${data.nights ? ` (${data.nights} night(s))` : ""}`,
      `${data.guests} guest(s) · ${data.rooms} room(s)`,
      data.roomType ? `Room: ${data.roomType}` : "",
      data.boardType ? `Board: ${data.boardType}` : "",
      data.cancellationPolicy ? `Cancellation: ${data.cancellationPolicy}` : "",
      `${data.currency} ${data.price.toLocaleString()}`,
      `RateHawk hotel reference: ${data.hotelId}`,
    ]
      .filter(Boolean)
      .join("\n");

    const baseRow: Record<string, unknown> = {
      request_reference: reference,
      service_id: service?.id ?? null,
      customer_id: customer?.id ?? null,
      user_id: user.id,
      service_type: SERVICE_TYPE,
      destination_country: data.location || data.hotelName,
      destination: data.location || data.hotelName,
      travel_date: data.checkInDate,
      return_date: data.checkOutDate,
      traveller_count: data.guests,
      full_name: user.full_name || user.email,
      email: user.email,
      phone: user.phone ?? "—",
      preferred_contact: "email",
      request_details: `Hotel selected from live search.\n\n${summary}`,
      consent_to_contact: true,
    };

    const hotelRow: Record<string, unknown> = {
      ...baseRow,
      service_category: "hotels",
      hotel_provider_id: data.hotelId,
      hotel_name: data.hotelName,
      hotel_image_url: data.hotelImage,
      hotel_rating: data.rating,
      hotel_location: data.location,
      hotel_address: data.address,
      hotel_check_in: data.checkInDate,
      hotel_check_out: data.checkOutDate,
      hotel_nights: data.nights,
      hotel_guests: data.guests,
      hotel_rooms: data.rooms,
      hotel_room_type: data.roomType,
      hotel_board_type: data.boardType,
      hotel_cancellation_policy: data.cancellationPolicy,
      hotel_price: data.price,
      hotel_currency: data.currency,
      hotel_book_hash: data.bookHash ?? null,
      booking_status: "not_booked",
    };

    let { data: request, error } = await supabase
      .from("service_requests")
      .insert(hotelRow)
      .select("id")
      .maybeSingle();

    // 42703 / PGRST204 = hotel columns not migrated yet — fall back to the
    // base row so the customer never loses their selection.
    if (error?.code === "42703" || error?.code === "PGRST204") {
      ({ data: request, error } = await supabase
        .from("service_requests")
        .insert(baseRow)
        .select("id")
        .maybeSingle());
    }

    if (error || !request) {
      console.error("[hotel-request]", error?.message);
      return {
        ok: false,
        reason: "error",
        message: error?.message ?? "We could not save this hotel request.",
      };
    }

    const requestId = String(request["id"]);

    await supabase.from("request_updates").insert({
      request_id: requestId,
      status: "new_request",
      message: `Customer selected ${data.hotelName} hotel stay (${data.checkInDate} → ${data.checkOutDate})`,
    });

    const { notifyRequestReceived } = await import("./notifications.server");
    await notifyRequestReceived({
      requestId,
      userId: user.id,
      reference,
      fullName: user.full_name || user.email,
      email: user.email,
      serviceLabel: SERVICE_TYPE,
      originCountry: "",
      destinationCountry: data.location || data.hotelName,
      travelDate: data.checkInDate,
      documentCount: 0,
    });

    return { ok: true, reference, requestId };
  });
