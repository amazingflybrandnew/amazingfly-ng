import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type InsuranceDiagnosticStep = {
  step: string;
  ms: number;
  ok: boolean;
  detail: string;
};

export type InsuranceDiagnostics = {
  environment: string;
  baseUrlConfigured: boolean;
  credentialsPresent: boolean;
  countryId: number;
  steps: InsuranceDiagnosticStep[];
  /** Net Allianz premium from the sample quote (no markup, no booking). */
  premium: { amount: number; currency: string } | null;
};

const input = z
  .object({
    // Default: Austria (Schengen). Any valid Allianz CountryId works.
    countryId: z.number().int().positive().default(2),
  })
  .strict();

/**
 * Admin-only: proves the Sanlam Allianz integration works end-to-end WITHOUT
 * buying anything. It logs in, pulls lookups + travel plans, and runs one live
 * quote (POST /api/Quote returns a price only — it never creates a booking or
 * charges money). Use it to confirm production credentials/base URL before
 * taking insurance live.
 */
export const runInsuranceDiagnostics = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data ?? {}))
  .handler(async ({ data }): Promise<InsuranceDiagnostics> => {
    const { requireAdmin } = await import("../admin.server");
    await requireAdmin("manage_payments");
    const {
      allianzEnvironment,
      getAllianzGenders,
      getAllianzBookingTypes,
      getAllianzTravelPlans,
      getAllianzQuote,
      toAllianzDate,
    } = await import("./allianz.server");

    const steps: InsuranceDiagnosticStep[] = [];
    const day = (offset: number) =>
      new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

    async function step<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
      const started = Date.now();
      try {
        const result = await fn();
        steps.push({ step: name, ms: Date.now() - started, ok: true, detail: "ok" });
        return result;
      } catch (error) {
        steps.push({
          step: name,
          ms: Date.now() - started,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }

    // 1. Login + a lookup — proves credentials, base URL and the token flow.
    const genders = await step("1. Login & lookups (GET genders)", () => getAllianzGenders());
    if (genders && steps[0]) steps[0].detail = `ok — ${genders.length} gender option(s)`;

    // 2. Booking types (to pick the "Individual" id for the sample quote).
    const bookingTypes = await step("2. Booking types", () => getAllianzBookingTypes());
    const individualType = bookingTypes?.find((b) => /individual/i.test(b.name))?.id ?? 1;

    // 3. Travel plans for the chosen destination.
    const plans = await step(`3. Travel plans (country ${data.countryId})`, () =>
      getAllianzTravelPlans(data.countryId),
    );
    if (plans && steps[2]) steps[2].detail = `ok — ${plans.length} plan(s)`;
    const planId = plans?.[0]?.id;

    // 4. Sample quote — a live price only. Never books, never charges.
    let premium: { amount: number; currency: string } | null = null;
    if (planId) {
      const quote = await step("4. Sample quote (POST /api/Quote)", () =>
        getAllianzQuote({
          DateOfBirth: toAllianzDate("1990-01-01"),
          Email: "info@amazingfly.ng",
          Telephone: "+2348000000000",
          CoverBegins: toAllianzDate(day(14)),
          CoverEnds: toAllianzDate(day(24)),
          CountryId: data.countryId,
          PurposeOfTravel: "Tourism / Holiday",
          TravelPlanId: planId,
          BookingTypeId: individualType,
          IsRoundTrip: true,
          NoOfPeople: 1,
          NoOfChildren: 0,
          IsMultiTrip: false,
        }),
      );
      if (quote) {
        const amount = Number(quote.Amount ?? 0);
        premium = { amount, currency: "NGN" };
        if (steps[3]) {
          steps[3].detail = amount > 0 ? `ok — net premium ₦${amount.toLocaleString()}` : "ok — but premium was 0";
        }
      }
    } else {
      steps.push({
        step: "4. Sample quote (POST /api/Quote)",
        ms: 0,
        ok: false,
        detail: "Skipped — no travel plan returned for this country.",
      });
    }

    return {
      environment: allianzEnvironment(),
      baseUrlConfigured: Boolean(process.env["ALLIANZ_API_BASE_URL"]?.trim()),
      credentialsPresent: Boolean(
        process.env["ALLIANZ_USERNAME"]?.trim() && process.env["ALLIANZ_PASSWORD"]?.trim(),
      ),
      countryId: data.countryId,
      steps,
      premium,
    };
  });
