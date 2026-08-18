import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  VISA_HOTEL_RESERVATION_CATEGORY,
  VISA_HOTEL_RESERVATION_FEE_NGN,
  VISA_HOTEL_RESERVATION_INTERNAL_SERVICE_TYPE,
  VISA_HOTEL_RESERVATION_PUBLIC_NAME,
} from "./visa-hotel-reservation";

const reservationInput = z
  .object({
    hotelId: z.string().trim().min(1).max(160),
    hotelName: z.string().trim().min(1).max(200),
    hotelImage: z.string().trim().max(600).nullable(),
    rating: z.number().min(0).max(5),
    location: z.string().trim().max(160),
    address: z.string().trim().max(400),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nights: z.number().int().min(1).max(60),
    guests: z.number().int().min(1).max(8),
    roomType: z.string().trim().min(1).max(160),
    boardType: z.string().trim().max(120).nullable(),
    cancellationPolicy: z.string().trim().min(1).max(400),
    hotelPrice: z.number().nonnegative(),
    hotelCurrency: z.string().trim().length(3),
    bookHash: z.string().trim().min(1).max(2000),
    providerPaymentAmount: z.number().nonnegative(),
    providerPaymentCurrency: z.string().trim().length(3),
    originCountry: z.string().trim().max(80).nullable().optional(),
    destinationCountry: z.string().trim().max(80).nullable().optional(),
  })
  .strict();

export type VisaHotelReservationSummary = {
  id: string;
  reference: string;
  serviceType: string;
  paymentStatus: string;
  bookingStatus: string;
  fee: number;
  feeCurrency: string;
  hotel: {
    id: string;
    name: string;
    imageUrl: string | null;
    rating: number;
    location: string;
    address: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    guests: number;
    roomType: string;
    boardType: string | null;
    cancellationPolicy: string;
    price: number;
    currency: string;
  };
};

export const createVisaHotelReservationRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reservationInput.parse(data))
  .handler(async ({ data }): Promise<
    | { ok: true; requestId: string; reference: string }
    | { ok: false; reason: "auth" | "error"; message: string }
  > => {
    const { getAuthenticatedUser } = await import("./auth.server");
    const session = await getAuthenticatedUser();
    if (!session?.user) {
      return {
        ok: false,
        reason: "auth",
        message: "Please sign in to continue with this visa hotel reservation.",
      };
    }

    const user = session.user;
    const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
    const { generateRequestReference } = await import("./request-reference");
    const db = createExternalSupabaseAdmin();
    const reference = generateRequestReference();

    const { data: service } = await db
      .from("services")
      .select("id")
      .eq("slug", "visa-assistance")
      .maybeSingle();

    const { data: customer } = await db
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

    const requestDetails = [
      `${VISA_HOTEL_RESERVATION_PUBLIC_NAME} selected from live RateHawk availability.`,
      `Hotel: ${data.hotelName}`,
      `Stay: ${data.checkInDate} → ${data.checkOutDate} (${data.nights} night(s))`,
      `Guests: ${data.guests} · 1 room`,
      `Room: ${data.roomType}`,
      data.boardType ? `Board: ${data.boardType}` : "",
      `Cancellation: ${data.cancellationPolicy}`,
      `Accommodation amount payable to property/provider under the rate terms: ${data.hotelCurrency} ${data.hotelPrice.toLocaleString()}`,
      `Amazingfly visa reservation service fee: NGN ${VISA_HOTEL_RESERVATION_FEE_NGN.toLocaleString()}`,
      "The Amazingfly service fee is separate from the accommodation cost and is not credited toward the hotel stay.",
    ]
      .filter(Boolean)
      .join("\n");

    const row: Record<string, unknown> = {
      request_reference: reference,
      service_id: service?.id ?? null,
      customer_id: customer?.id ?? null,
      user_id: user.id,
      service_type: VISA_HOTEL_RESERVATION_INTERNAL_SERVICE_TYPE,
      service_category: VISA_HOTEL_RESERVATION_CATEGORY,
      origin_country: data.originCountry ?? null,
      destination_country: data.destinationCountry ?? data.location,
      destination: data.location || data.hotelName,
      travel_date: data.checkInDate,
      return_date: data.checkOutDate,
      traveller_count: data.guests,
      full_name: user.full_name || user.email,
      email: user.email,
      phone: user.phone ?? "—",
      preferred_contact: "email",
      request_details: requestDetails,
      amount: VISA_HOTEL_RESERVATION_FEE_NGN,
      currency: "NGN",
      requires_quote: false,
      payment_status: "pending_payment",
      booking_status: "not_booked",
      consent_to_contact: true,
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
      hotel_rooms: 1,
      hotel_room_type: data.roomType,
      hotel_board_type: data.boardType,
      hotel_cancellation_policy: data.cancellationPolicy,
      hotel_price: data.hotelPrice,
      hotel_currency: data.hotelCurrency,
      hotel_book_hash: data.bookHash,
      hotel_payment_type: "hotel",
      hotel_payment_requires_card: false,
      hotel_payment_requires_cvc: false,
      hotel_provider_payment_amount: data.providerPaymentAmount,
      hotel_provider_payment_currency: data.providerPaymentCurrency,
    };

    const { data: request, error } = await db
      .from("service_requests")
      .insert(row)
      .select("id")
      .maybeSingle();

    if (error || !request) {
      console.error("[visa-hotel-reservation] create", error?.message);
      return {
        ok: false,
        reason: "error",
        message: error?.message ?? "We could not save this reservation request.",
      };
    }

    const requestId = String((request as { id: string }).id);
    await db.from("request_updates").insert({
      request_id: requestId,
      status: "new_request",
      message: `Visa hotel reservation selected: ${data.hotelName}`,
    });

    try {
      const { notifyRequestReceived } = await import("./notifications.server");
      await notifyRequestReceived({
        requestId,
        userId: user.id,
        reference,
        fullName: user.full_name || user.email,
        email: user.email,
        serviceLabel: VISA_HOTEL_RESERVATION_PUBLIC_NAME,
        originCountry: data.originCountry ?? "",
        destinationCountry: data.destinationCountry ?? data.location,
        travelDate: data.checkInDate,
        documentCount: 0,
      });
    } catch (notifyError) {
      console.error("[visa-hotel-reservation] notification", notifyError);
    }

    return { ok: true, requestId, reference };
  });

export const getVisaHotelReservationRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<VisaHotelReservationSummary | null> => {
    const { requireUser } = await import("./auth.server");
    const { user } = await requireUser();
    const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
    const db = createExternalSupabaseAdmin();

    const { data: row, error } = await db
      .from("service_requests")
      .select("*")
      .eq("id", data.request_id)
      .eq("user_id", user.id)
      .eq("service_category", VISA_HOTEL_RESERVATION_CATEGORY)
      .maybeSingle();

    if (error || !row) {
      if (error) console.error("[visa-hotel-reservation] load", error.message);
      return null;
    }

    const value = row as Record<string, unknown>;
    return {
      id: String(value["id"]),
      reference: String(value["request_reference"] ?? ""),
      serviceType: VISA_HOTEL_RESERVATION_PUBLIC_NAME,
      paymentStatus: String(value["payment_status"] ?? "pending_payment"),
      bookingStatus: String(value["booking_status"] ?? "not_booked"),
      fee: Number(value["amount"] ?? VISA_HOTEL_RESERVATION_FEE_NGN),
      feeCurrency: String(value["currency"] ?? "NGN"),
      hotel: {
        id: String(value["hotel_provider_id"] ?? ""),
        name: String(value["hotel_name"] ?? ""),
        imageUrl: value["hotel_image_url"] ? String(value["hotel_image_url"]) : null,
        rating: Number(value["hotel_rating"] ?? 0),
        location: String(value["hotel_location"] ?? ""),
        address: String(value["hotel_address"] ?? ""),
        checkIn: String(value["hotel_check_in"] ?? value["travel_date"] ?? ""),
        checkOut: String(value["hotel_check_out"] ?? value["return_date"] ?? ""),
        nights: Number(value["hotel_nights"] ?? 1),
        guests: Number(value["hotel_guests"] ?? value["traveller_count"] ?? 1),
        roomType: String(value["hotel_room_type"] ?? "Room"),
        boardType: value["hotel_board_type"] ? String(value["hotel_board_type"]) : null,
        cancellationPolicy: String(value["hotel_cancellation_policy"] ?? "Supplier terms apply"),
        price: Number(value["hotel_price"] ?? 0),
        currency: String(value["hotel_currency"] ?? "USD"),
      },
    };
  });
