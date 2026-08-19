import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toHotelRequest } from "./hotel-stay";
import type { HotelResult, HotelSearchResponse, RoomResult } from "./hotel.types";

const HOTEL_INFO_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

const guestsInput = z
  .object({
    adults: z.number().int().min(1).max(12),
    children: z.number().int().min(0).max(8).default(0),
    childAges: z.array(z.number().int().min(0).max(17)).max(8).optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.childAges?.length ?? 0) !== value.children) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["childAges"],
        message: "Please provide the age of every child.",
      });
    }
  });

const stayInput = z
  .object({
    destination: z.string().trim().min(2).max(80),
    checkInDate: z.string().trim().min(8).max(32),
    checkOutDate: z.string().trim().min(8).max(32),
    guests: guestsInput,
    rooms: z.literal(1, {
      errorMap: () => ({ message: "Only one room booking is currently supported." }),
    }),
    nationality: z.string().trim().min(2).max(2).optional(),
    currency: z.string().trim().min(3).max(3).optional(),
  })
  .strict();

const detailsInput = z
  .object({
    hotelId: z.string().trim().min(1).max(120),
    stay: stayInput,
  })
  .strict();

export type HotelDetailsPayload =
  | {
      ok: true;
      hotel: (HotelResult & { description: string; policies: string }) | null;
      rooms: RoomResult[];
    }
  | { ok: false; error: string };

export type HotelRoomsPayload =
  | { ok: true; rooms: RoomResult[] }
  | { ok: false; error: string };

export const searchHotelStays = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => stayInput.parse(data))
  .handler(async ({ data }): Promise<HotelSearchResponse> => {
    const { searchHotels } = await import("./hotels.server");
    try {
      const results = await searchHotels(toHotelRequest(data));
      return { ok: true, results };
    } catch (error) {
      console.error("[Hotels] search failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to search hotels right now.",
      };
    }
  });

export const getVisaHotelStayRooms = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => detailsInput.parse(data))
  .handler(async ({ data }): Promise<HotelRoomsPayload> => {
    const { getHotelRooms } = await import("./hotels.server");
    try {
      // The provider transport enforces the ETG-aligned 30-second Hotelpage timeout.
      const rooms = await getHotelRooms(data.hotelId, toHotelRequest(data.stay));
      return { ok: true, rooms };
    } catch (error) {
      console.error("[Visa hotel] room lookup failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load live bookable rooms right now.",
      };
    }
  });

export const getHotelStayDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => detailsInput.parse(data))
  .handler(async ({ data }): Promise<HotelDetailsPayload> => {
    const { getHotelDetails, getHotelRooms } = await import("./hotels.server");
    try {
      // Static hotel content is optional for this interaction; cap that lookup
      // independently while live room availability uses the ETG-aligned 30s
      // provider transport timeout.
      const hotelPromise = withTimeout(
        getHotelDetails(data.hotelId),
        HOTEL_INFO_TIMEOUT_MS,
        "Hotel information took too long to load.",
      ).catch(() => null);

      const rooms = await getHotelRooms(data.hotelId, toHotelRequest(data.stay));
      const hotel = await hotelPromise;
      return { ok: true, hotel, rooms };
    } catch (error) {
      console.error("[Hotels] details failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load this hotel right now.",
      };
    }
  });

const prebookInput = z
  .object({
    bookHash: z.string().trim().min(1).max(2000),
    expectedPrice: z.number().nonnegative(),
    expectedCurrency: z.string().trim().min(3).max(3),
  })
  .strict();

export type HotelPrebookPayload =
  | { ok: true; status: "available"; room: RoomResult }
  | { ok: true; status: "price_changed"; room: RoomResult; previousPrice: number }
  | { ok: false; error: string };

export const prebookHotelStayRate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => prebookInput.parse(data))
  .handler(async ({ data }): Promise<HotelPrebookPayload> => {
    const { prebookHotelRate } = await import("./hotels.server");
    try {
      const outcome = await prebookHotelRate(
        data.bookHash,
        data.expectedPrice,
        data.expectedCurrency,
      );
      if (outcome.status === "unavailable") return { ok: false, error: outcome.message };
      if (outcome.status === "price_changed") {
        return {
          ok: true,
          status: "price_changed",
          room: outcome.room,
          previousPrice: outcome.previousPrice,
        };
      }
      return { ok: true, status: "available", room: outcome.room };
    } catch (error) {
      console.error("[Hotels] prebook failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "We could not confirm this rate.",
      };
    }
  });
