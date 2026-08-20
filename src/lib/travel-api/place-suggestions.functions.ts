import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { FlightPlaceSuggestion } from "./flights.server";

export type FlightPlaceSuggestionsResponse =
  | { ok: true; suggestions: FlightPlaceSuggestion[] }
  | { ok: false; error: string };

export const getFlightPlaceSuggestions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ query: z.string().trim().min(2).max(80) }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<FlightPlaceSuggestionsResponse> => {
    try {
      const { searchFlightPlaces } = await import("./flights.server");
      return { ok: true, suggestions: await searchFlightPlaces(data.query) };
    } catch (error) {
      console.error("[flight places]", error);
      return { ok: false, error: "Airport suggestions are temporarily unavailable." };
    }
  });
