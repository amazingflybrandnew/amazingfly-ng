import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toHotelRequest } from "./hotel-stay";
import type { HotelResult, HotelSearchResponse, RoomResult } from "./hotel.types";

const stayInput = z
  .object({
    destination: z.string().trim().min(2).max(80),
    checkInDate: z.string().trim().min(8).max(32),
    checkOutDate: z.string().trim().min(8).max(32),
    guests: z.object({
      adults: z.number().int().min(1).max(12),
      children: z.number().int().min(0).max(8).default(0),
    }),
    rooms: z.number().int().min(1).max(8),
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

export const searchHotelStays = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => stayInput.parse(data))
  .handler(async ({ data }): Promise<HotelSearchResponse> => {
    const { searchHotels } = await import("./hotels.server");
    try {
      const results = await searchHotels(toHotelRequest(data));
      return { ok: true, results };
    } catch (error) {
      console.error("[Hotels] search failed", error);
      const message =
        error instanceof Error ? error.message : "Unable to search hotels right now.";
      return { ok: false, error: message };
    }
  });

export const getHotelStayDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => detailsInput.parse(data))
  .handler(async ({ data }): Promise<HotelDetailsPayload> => {
    const { getHotelDetails, getHotelRooms } = await import("./hotels.server");
    try {
      const [hotel, rooms] = await Promise.all([
        getHotelDetails(data.hotelId),
        getHotelRooms(data.hotelId, toHotelRequest(data.stay)).catch(() => [] as RoomResult[]),
      ]);
      return { ok: true, hotel, rooms };
    } catch (error) {
      console.error("[Hotels] details failed", error);
      const message =
        error instanceof Error ? error.message : "Unable to load this hotel right now.";
      return { ok: false, error: message };
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
      if (outcome.status === "unavailable") {
        return { ok: false, error: outcome.message };
      }
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
      const message =
        error instanceof Error ? error.message : "We could not confirm this rate.";
      return { ok: false, error: message };
    }
  });
