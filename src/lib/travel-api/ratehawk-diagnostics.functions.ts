import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export type DiagnosticStep = {
  step: string;
  ms: number;
  ok: boolean;
  detail: string;
};

export type RateHawkDiagnostics = {
  environment: string;
  viaProxy: boolean;
  hotelId: string;
  steps: DiagnosticStep[];
};

const input = z
  .object({
    hotelId: z.string().trim().min(3).max(80).default("10004834"),
    /** Opening a booking process can interfere with real sandbox bookings. */
    includeBookingForm: z.boolean().default(false),
  })
  .strict();

type Rate = { book_hash?: string; room_name?: string };
type HotelsData = { hotels?: { rates?: Rate[] }[] };

/**
 * Admin-only: runs hotelpage -> prebook -> booking/form against RateHawk with
 * the site's own credentials and proxy, and reports timings and errors. The
 * booking process is only started (never finished), so nothing is booked.
 */
export const runRateHawkDiagnostics = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data ?? {}))
  .handler(async ({ data }): Promise<RateHawkDiagnostics> => {
    const { requireAdmin } = await import("../admin.server");
    await requireAdmin("manage_payments");
    const { ratehawkRequest, ratehawkEnvironment, RateHawkApiError } = await import(
      "../ratehawk.server"
    );

    const steps: DiagnosticStep[] = [];
    async function timed<T>(step: string, run: () => Promise<T>): Promise<T | null> {
      const started = Date.now();
      try {
        const result = await run();
        steps.push({ step, ms: Date.now() - started, ok: true, detail: "ok" });
        return result;
      } catch (error) {
        const detail =
          error instanceof RateHawkApiError
            ? `HTTP ${error.status} - ${error.code}`
            : error instanceof Error
              ? error.message
              : String(error);
        steps.push({ step, ms: Date.now() - started, ok: false, detail });
        return null;
      }
    }

    const day = (offset: number) =>
      new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const hid = /^\d{6,10}$/.test(data.hotelId) ? Number(data.hotelId) : null;

    const hp = await timed("1. Hotel page rates (/search/hp/)", () =>
      ratehawkRequest<HotelsData>("/api/b2b/v3/search/hp/", {
        ...(hid ? { hid } : { id: data.hotelId }),
        checkin: day(14),
        checkout: day(16),
        guests: [{ adults: 2, children: [] }],
        residency: "ng",
        currency: "USD",
        language: "en",
      }),
    );
    const rates = hp?.data?.hotels?.[0]?.rates ?? [];
    if (hp) steps[steps.length - 1]!.detail = `ok - ${rates.length} rate(s)`;

    const hash = rates[0]?.book_hash;
    const prebook = hash
      ? await timed("2. Rate check (/hotel/prebook/)", () =>
          ratehawkRequest<HotelsData>("/api/b2b/v3/hotel/prebook/", {
            hash,
            price_increase_percent: 10,
          }),
        )
      : null;

    const prebookHash = prebook?.data?.hotels?.[0]?.rates?.[0]?.book_hash;
    if (prebookHash && data.includeBookingForm) {
      const ip =
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
        getRequestHeader("x-real-ip")?.trim() ||
        "127.0.0.1";
      await timed("3. Start booking (/hotel/order/booking/form/)", () =>
        ratehawkRequest("/api/b2b/v3/hotel/order/booking/form/", {
          partner_order_id: `diag-${crypto.randomUUID()}`,
          book_hash: prebookHash,
          language: "en",
          user_ip: ip,
        }),
      );
    }

    return {
      environment: ratehawkEnvironment(),
      viaProxy: Boolean(process.env["RATEHAWK_PROXY_URL"]?.trim()),
      hotelId: data.hotelId,
      steps,
    };
  });
