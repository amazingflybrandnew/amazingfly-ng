import { createServerFn } from "@tanstack/react-start";

import { savePassengersSchema, validatePassengers } from "./passenger.types";
import type { PassengerBundle } from "./passengers.server";
import { z } from "zod";

export type { PassengerBundle };

/** Traveller + contact details already saved for a request. */
export const getBookingPassengers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<PassengerBundle | null> => {
    const { requireUser } = await import("../auth.server");
    const { loadPassengers } = await import("./passengers.server");
    const { user } = await requireUser();
    return loadPassengers(user, data.request_id);
  });

/** Saves booking contact + every traveller before the review step. */
export const saveBookingPassengers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => savePassengersSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const invalid = validatePassengers(data.passengers, data.passportRequired);
    if (invalid) return { ok: false, message: invalid };

    const { requireUser } = await import("../auth.server");
    const { savePassengers } = await import("./passengers.server");
    const { user } = await requireUser();
    return savePassengers(user, {
      requestId: data.request_id,
      contact: data.contact,
      passengers: data.passengers,
    });
  });
