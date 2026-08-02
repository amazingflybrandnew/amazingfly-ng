import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

type StayInput = z.infer<typeof stayInput>;

function toRequest(data: StayInput) {
  return {
    destination: data.destination,
    checkInDate: data.checkInDate,
    checkOutDate: data.checkOutDate,
    guests: data.guests,
    rooms: data.rooms,
    ...(data.nationality ? { nationality: data.nationality } : {}),
    ...(data.currency ? { currency: data.currency } : {}),
  };
}

export const searchHotelStays = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => stayInput.parse(data))
  .handler(async ({ data }): Promise<HotelSearchResponse> => {
    const { searchHotels } = await import("./hotels.server");
    try {
      const results = await searchHotels(toRequest(data));
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
        getHotelRooms(data.hotelId, toRequest(data.stay)).catch(() => [] as RoomResult[]),
      ]);
      return { ok: true, hotel, rooms };
    } catch (error) {
      console.error("[Hotels] details failed", error);
      const message =
        error instanceof Error ? error.message : "Unable to load this hotel right now.";
      return { ok: false, error: message };
    }
  });
