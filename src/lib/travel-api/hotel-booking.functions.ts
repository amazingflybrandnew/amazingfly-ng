/**
 * Client-callable wrappers around the RateHawk booking sequence.
 * Hotels only — flights, visas, documents and Paystack are untouched.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const guestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

const createInput = z
  .object({
    bookHash: z.string().trim().min(1).max(2000),
    requestId: z.string().trim().uuid().nullable().optional(),
  })
  .strict();

const startInput = z
  .object({
    partnerOrderId: z.string().trim().uuid(),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(6).max(32),
    guests: z.array(guestSchema).min(1).max(10),
    amount: z.number().nonnegative(),
    currency: z.string().trim().min(3).max(3),
    paymentType: z.enum(["deposit", "hotel"]),
    comment: z.string().trim().max(500).optional(),
  })
  .strict();

const checkInput = z.object({ partnerOrderId: z.string().trim().uuid() }).strict();
const requestInput = z.object({ request_id: z.string().uuid() }).strict();

export type CreateBookingPayload =
  | { ok: true; partnerOrderId: string; orderId: string; itemId: string | null }
  | { ok: false; error: string };

export type SimpleBookingPayload = { ok: true } | { ok: false; error: string };

export type CheckBookingPayload =
  | {
      ok: true;
      status: "ok" | "processing" | "failed";
      providerStatus: string | null;
      percent: number | null;
      message: string | null;
    }
  | { ok: false; error: string };

export type StoredHotelBookingPayload =
  | {
      ok: true;
      status: "created" | "started" | "processing" | "ok" | "failed";
      partnerOrderId: string;
      orderId: string | null;
    }
  | { ok: false; error: string };

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Legacy step 1 wrapper retained for existing internal/manual tooling. */
export const createHotelBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createInput.parse(data))
  .handler(async ({ data }): Promise<CreateBookingPayload> => {
    const { createBookingProcess } = await import("./hotel-booking.server");
    try {
      const created = await createBookingProcess({
        bookHash: data.bookHash,
        requestId: data.requestId ?? null,
      });
      return {
        ok: true,
        partnerOrderId: created.partnerOrderId,
        orderId: created.orderId,
        itemId: created.itemId,
      };
    } catch (error) {
      console.error("[Hotels] create booking failed", error);
      return { ok: false, error: toMessage(error, "We could not start this booking.") };
    }
  });

/** Legacy step 2 wrapper retained for existing internal/manual tooling. */
export const startHotelBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => startInput.parse(data))
  .handler(async ({ data }): Promise<SimpleBookingPayload> => {
    const { startBookingProcess } = await import("./hotel-booking.server");
    try {
      await startBookingProcess({
        partnerOrderId: data.partnerOrderId,
        email: data.email,
        phone: data.phone,
        guests: data.guests,
        amount: data.amount,
        currency: data.currency,
        paymentType: data.paymentType,
        comment: data.comment ?? "",
      });
      return { ok: true };
    } catch (error) {
      console.error("[Hotels] start booking failed", error);
      return { ok: false, error: toMessage(error, "We could not confirm this booking.") };
    }
  });

export const checkHotelBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkInput.parse(data))
  .handler(async ({ data }): Promise<CheckBookingPayload> => {
    const { checkBookingProcess } = await import("./hotel-booking.server");
    try {
      const result = await checkBookingProcess(data.partnerOrderId);
      return {
        ok: true,
        status:
          result.status === "created" || result.status === "started"
            ? "processing"
            : result.status,
        providerStatus: result.providerStatus,
        percent: result.percent,
        message: result.message,
      };
    } catch (error) {
      console.error("[Hotels] check booking failed", error);
      return { ok: false, error: toMessage(error, "We could not read the booking status.") };
    }
  });

/**
 * Customer action for a RateHawk `hotel` payment type (reserve now / pay at property).
 * All sensitive booking values are reloaded server-side from service_requests.
 */
export const reserveHotelAtProperty = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestInput.parse(data))
  .handler(async ({ data }): Promise<StoredHotelBookingPayload> => {
    const { requireUser } = await import("../auth.server");
    const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
    const { bookStoredHotelRequest } = await import("./hotel-booking.server");
    const { user } = await requireUser();
    const db = createExternalSupabaseAdmin();

    const { data: request } = await db
      .from("service_requests")
      .select("user_id")
      .eq("id", data.request_id)
      .maybeSingle();

    if (!request || String((request as Record<string, unknown>)["user_id"] ?? "") !== user.id) {
      return { ok: false, error: "We could not find that hotel booking on your account." };
    }

    try {
      const result = await bookStoredHotelRequest(data.request_id, "hotel");
      return {
        ok: true,
        status: result.status,
        partnerOrderId: result.partnerOrderId,
        orderId: result.orderId,
      };
    } catch (error) {
      console.error("[Hotels] pay-at-property booking failed", error);
      return {
        ok: false,
        error: toMessage(error, "We could not reserve this hotel at the property rate."),
      };
    }
  });
