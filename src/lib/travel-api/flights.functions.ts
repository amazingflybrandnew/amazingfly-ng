import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { FlightSearchResponse } from "./flight.types";

const searchInput = z
  .object({
    origin: z.string().trim().min(2).max(60),
    destination: z.string().trim().min(2).max(60),
    departureDate: z.string().trim().min(4).max(32),
    returnDate: z.string().trim().max(32).optional(),
    passengers: z.object({
      adults: z.number().int().min(1).max(9),
      children: z.number().int().min(0).max(8).default(0),
      infants: z.number().int().min(0).max(8).default(0),
    }),
    cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
    additionalSlices: z
      .array(
        z.object({
          origin: z.string().trim().min(2).max(60),
          destination: z.string().trim().min(2).max(60),
          departureDate: z.string().trim().min(4).max(32),
        }),
      )
      .max(4)
      .optional(),
    maxConnections: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  })
  .strict();

export const searchFlightOffers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchInput.parse(data))
  .handler(async ({ data }): Promise<FlightSearchResponse> => {
    const { searchFlights } = await import("./flights.server");
    try {
      const { returnDate, additionalSlices, maxConnections, ...rest } = data;
      const results = await searchFlights(
        {
          ...rest,
          ...(returnDate ? { returnDate } : {}),
          ...(additionalSlices?.length ? { additionalSlices } : {}),
          ...(maxConnections !== undefined ? { maxConnections } : {}),
        },
      );
      return { ok: true, results };
    } catch (error) {
      console.error("[Flights] search failed", error);
      const message =
        error instanceof Error ? error.message : "Unable to search flights right now.";
      return { ok: false, error: message };
    }
  });
