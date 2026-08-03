import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { HoldResult } from "./hold.server";

export type { HoldResult };

/** "Book on Hold" — reserves the airline seat without taking payment. */
export const holdBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<HoldResult> => {
    const { requireUser } = await import("../auth.server");
    const { holdFlightBooking } = await import("./hold.server");
    const { user } = await requireUser();
    return holdFlightBooking(user, data.request_id);
  });
