import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { FlightOfferInfoResponse } from "./flight-offer.types";

/** Duffel fare conditions, baggage and hold capability for a selected offer. */
export const getFlightOfferInfo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ offer_id: z.string().trim().min(1).max(120) }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<FlightOfferInfoResponse> => {
    const { getOfferInfo } = await import("./flights.server");
    try {
      const info = await getOfferInfo(data.offer_id);
      if (!info) return { ok: false, error: "This offer is no longer available from the airline." };
      return { ok: true, info };
    } catch (error) {
      console.error("[Flights] offer info failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Fare details are unavailable right now.",
      };
    }
  });
