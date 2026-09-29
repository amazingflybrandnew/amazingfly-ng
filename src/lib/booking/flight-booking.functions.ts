import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { IssueFlightResult } from "./flight-booking.server";

/**
 * Admin action: issue the ticket for a paid, held flight after the Duffel
 * balance has been funded. Guarded by admin payment permissions.
 */
export const issueFlightTicket = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<IssueFlightResult> => {
    const { requireAdmin } = await import("../admin.server");
    await requireAdmin("manage_payments");
    const { issuePaidFlightTicket } = await import("./flight-booking.server");
    return issuePaidFlightTicket(data.requestId);
  });
