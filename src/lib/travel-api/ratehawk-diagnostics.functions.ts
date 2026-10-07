import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export type DiagnosticStep = {
  step: string;
  endpoint: string;
  ms: number;
  ok: boolean;
  httpStatus: number;
  detail: string;
  /** Full request body we sent (pretty JSON) — safe to share with RateHawk. */
  request: string;
  /** Full raw response body from RateHawk (pretty JSON where possible). */
  response: string;
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

function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Pull the first rate's book_hash out of a hotelpage/prebook response. */
function firstBookHash(responseJson: unknown): string | undefined {
  const data = asRecord(asRecord(responseJson)?.["data"]);
  const hotels = Array.isArray(data?.["hotels"]) ? (data!["hotels"] as unknown[]) : [];
  const rates = Array.isArray(asRecord(hotels[0])?.["rates"])
    ? (asRecord(hotels[0])!["rates"] as unknown[])
    : [];
  const hash = asRecord(rates[0])?.["book_hash"];
  return typeof hash === "string" ? hash : undefined;
}

function rateCount(responseJson: unknown): number {
  const data = asRecord(asRecord(responseJson)?.["data"]);
  const hotels = Array.isArray(data?.["hotels"]) ? (data!["hotels"] as unknown[]) : [];
  const rates = Array.isArray(asRecord(hotels[0])?.["rates"])
    ? (asRecord(hotels[0])!["rates"] as unknown[])
    : [];
  return rates.length;
}

/** First rate whose payment option is refundable (has a free cancellation date). */
function firstRefundableBookHash(responseJson: unknown): string | undefined {
  const data = asRecord(asRecord(responseJson)?.["data"]);
  const hotels = Array.isArray(data?.["hotels"]) ? (data!["hotels"] as unknown[]) : [];
  const rates = Array.isArray(asRecord(hotels[0])?.["rates"])
    ? (asRecord(hotels[0])!["rates"] as unknown[])
    : [];
  for (const rateValue of rates) {
    const rate = asRecord(rateValue);
    const options = asRecord(rate?.["payment_options"]);
    const types = Array.isArray(options?.["payment_types"])
      ? (options!["payment_types"] as unknown[])
      : [];
    const refundable = types.some((t) => {
      const penalties = asRecord(asRecord(t)?.["cancellation_penalties"]);
      const free = penalties?.["free_cancellation_before"];
      return typeof free === "string" && free.length > 0;
    });
    const hash = rate?.["book_hash"];
    if (refundable && typeof hash === "string") return hash;
  }
  return undefined;
}

export type CreditCardTestStep = { step: string; ok: boolean; detail: string };
export type CreditCardTestResult = {
  environment: string;
  viaProxy: boolean;
  egressIpSeenByRateHawk: string | null;
  steps: CreditCardTestStep[];
  partnerOrderId: string | null;
  orderId: string | null;
  finalStatus: string | null;
};

/**
 * Admin-only: runs the REAL credit-card ("now") booking path end-to-end against
 * the ETG demo hotel (8473727) with a refundable rate — search → prebook →
 * Create booking process → Payota card token → Start booking (now) → Check
 * status. This books the demo hotel and charges the corporate card the net
 * amount (a few USD, refundable); cancel it afterwards from the request/booking.
 */
export const runCreditCardTestBooking = createServerFn({ method: "POST" })
  .handler(async (): Promise<CreditCardTestResult> => {
    const { requireAdmin } = await import("../admin.server");
    await requireAdmin("manage_payments");
    const { ratehawkExchange, ratehawkEnvironment } = await import("../ratehawk.server");
    const { runBookingSequence } = await import("./hotel-booking.server");

    const steps: CreditCardTestStep[] = [];
    const day = (offset: number) =>
      new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    let egressIp: string | null = null;

    // 1. Search the demo hotel.
    const hp = await ratehawkExchange("/api/b2b/v3/search/hp/", {
      hid: 8473727,
      checkin: day(14),
      checkout: day(16),
      guests: [{ adults: 2, children: [] }],
      residency: "ng",
      currency: "USD",
      language: "en",
    });
    egressIp =
      (asRecord(asRecord(hp.responseJson)?.["debug"])?.["real_ip"] as string | undefined) ?? null;
    const refundableHash = firstRefundableBookHash(hp.responseJson);
    steps.push({
      step: "1. Search demo hotel (/search/hp/)",
      ok: hp.ok && Boolean(refundableHash),
      detail: hp.ok
        ? refundableHash
          ? `ok — refundable rate found`
          : "No refundable rate returned."
        : `HTTP ${hp.httpStatus}`,
    });
    if (!refundableHash) {
      return finish();
    }

    // 2. Prebook the refundable rate for a fresh book_hash.
    const prebook = await ratehawkExchange("/api/b2b/v3/hotel/prebook/", {
      hash: refundableHash,
      price_increase_percent: 10,
    });
    const freshHash = firstBookHash(prebook.responseJson) ?? refundableHash;
    steps.push({
      step: "2. Prebook (/hotel/prebook/)",
      ok: prebook.ok,
      detail: prebook.ok ? "ok" : `HTTP ${prebook.httpStatus}`,
    });
    if (!prebook.ok) return finish();

    // 3. Full credit-card booking: create → Payota token → finish (now) → status.
    const ip =
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip")?.trim() ||
      "127.0.0.1";
    try {
      const outcome = await runBookingSequence({
        bookHash: freshHash,
        requestId: null,
        userIp: ip,
        email: "test@amazingfly.ng",
        phone: "08031234567",
        guests: [
          { firstName: "Test", lastName: "Guest" },
          { firstName: "Second", lastName: "Guest" },
        ],
        paymentType: "now",
        comment: "Amazingfly credit-card test booking (demo hotel).",
      });
      steps.push({
        step: "3. Credit-card booking (Payota token → finish 'now' → status)",
        ok: outcome.result.status === "ok" || outcome.result.status === "processing",
        detail: `status=${outcome.result.status}${
          outcome.result.providerStatus ? ` (${outcome.result.providerStatus})` : ""
        }${outcome.result.message ? ` — ${outcome.result.message}` : ""}`,
      });
      return finish(outcome.partnerOrderId, outcome.orderId, outcome.result.status);
    } catch (error) {
      steps.push({
        step: "3. Credit-card booking (Payota token → finish 'now' → status)",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
      return finish();
    }

    function finish(
      partnerOrderId: string | null = null,
      orderId: string | null = null,
      finalStatus: string | null = null,
    ): CreditCardTestResult {
      return {
        environment: ratehawkEnvironment(),
        viaProxy: Boolean(process.env["RATEHAWK_PROXY_URL"]?.trim()),
        egressIpSeenByRateHawk: egressIp,
        steps,
        partnerOrderId,
        orderId,
        finalStatus,
      };
    }
  });

/**
 * Admin-only: runs hotelpage -> prebook -> booking/form against RateHawk with the
 * site's own credentials and proxy, and captures the full request/response for
 * each step (including errors like rate_not_found) so they can be sent to
 * RateHawk support. The booking process is only started (never finished).
 */
export const runRateHawkDiagnostics = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data ?? {}))
  .handler(async ({ data }): Promise<RateHawkDiagnostics> => {
    const { requireAdmin } = await import("../admin.server");
    await requireAdmin("manage_payments");
    const { ratehawkExchange, ratehawkEnvironment } = await import("../ratehawk.server");

    const steps: DiagnosticStep[] = [];

    async function runStep(step: string, endpoint: string, body: unknown) {
      const started = Date.now();
      try {
        const ex = await ratehawkExchange(endpoint, body);
        const apiError = asRecord(ex.responseJson)?.["status"] === "error";
        const errText = asRecord(ex.responseJson)?.["error"];
        const ok = ex.ok && !apiError;
        steps.push({
          step,
          endpoint,
          ms: Date.now() - started,
          ok,
          httpStatus: ex.httpStatus,
          detail: ok
            ? "ok"
            : `HTTP ${ex.httpStatus}${typeof errText === "string" ? ` - ${errText}` : ""}`,
          request: JSON.stringify(ex.requestBody ?? {}, null, 2),
          response: ex.responseText ? prettyJson(ex.responseText) : "(empty response body)",
        });
        return ex;
      } catch (error) {
        steps.push({
          step,
          endpoint,
          ms: Date.now() - started,
          ok: false,
          httpStatus: 0,
          detail: error instanceof Error ? error.message : String(error),
          request: JSON.stringify(body ?? {}, null, 2),
          response: "(no response — transport/connection error)",
        });
        return null;
      }
    }

    const day = (offset: number) =>
      new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const hid = /^\d{6,10}$/.test(data.hotelId) ? Number(data.hotelId) : null;

    // 1. Hotel page rates
    const hp = await runStep("1. Hotel page rates (/search/hp/)", "/api/b2b/v3/search/hp/", {
      ...(hid ? { hid } : { id: data.hotelId }),
      checkin: day(14),
      checkout: day(16),
      guests: [{ adults: 2, children: [] }],
      residency: "ng",
      currency: "USD",
      language: "en",
    });
    if (hp && steps[0]?.ok) steps[0].detail = `ok — ${rateCount(hp.responseJson)} rate(s)`;

    // 2. Rate check (prebook) using the freshest hotelpage hash
    const hash = firstBookHash(hp?.responseJson);
    const prebook = hash
      ? await runStep("2. Rate check (/hotel/prebook/)", "/api/b2b/v3/hotel/prebook/", {
          hash,
          price_increase_percent: 10,
        })
      : null;
    if (!hash) {
      steps.push({
        step: "2. Rate check (/hotel/prebook/)",
        endpoint: "/api/b2b/v3/hotel/prebook/",
        ms: 0,
        ok: false,
        httpStatus: 0,
        detail: "Skipped — no book_hash returned by the hotel page.",
        request: "(skipped)",
        response: "(skipped)",
      });
    }

    // 3. Start booking (optional) using the freshest prebook hash
    const prebookHash = firstBookHash(prebook?.responseJson) ?? hash;
    if (prebookHash && data.includeBookingForm) {
      const ip =
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
        getRequestHeader("x-real-ip")?.trim() ||
        "127.0.0.1";
      await runStep(
        "3. Start booking (/hotel/order/booking/form/)",
        "/api/b2b/v3/hotel/order/booking/form/",
        {
          partner_order_id: `diag-${crypto.randomUUID()}`,
          book_hash: prebookHash,
          language: "en",
          user_ip: ip,
        },
      );
    }

    return {
      environment: ratehawkEnvironment(),
      viaProxy: Boolean(process.env["RATEHAWK_PROXY_URL"]?.trim()),
      hotelId: data.hotelId,
      steps,
    };
  });
