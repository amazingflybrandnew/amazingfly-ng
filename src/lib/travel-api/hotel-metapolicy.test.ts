import { describe, expect, test } from "bun:test";
import { formatHotelMetapolicy } from "./hotel-metapolicy";
import { cancellationPeriods, formatUtcDateTime } from "./hotel-format";

describe("hotel metapolicy", () => {
  test("formats struct sections and extra info", () => {
    const sections = formatHotelMetapolicy(
      {
        deposit: [
          {
            availability: "available",
            currency: "EUR",
            deposit_type: "breakage",
            payment_type: "cash",
            price: "50",
            pricing_method: "per_room_per_stay",
          },
        ],
        pets: [
          {
            inclusion: "not_included",
            pets_type: "pets_allowed",
            price: "20",
            currency: "EUR",
            price_unit: "per_night",
          },
        ],
        visa: { visa_support: "support_enable" },
        internet: [],
      },
      "<p>Passport required at check-in.</p>",
    );
    expect(sections.map((s) => s.title)).toEqual([
      "Deposit at check-in",
      "Pets",
      "Visa support",
      "Important information",
    ]);
    expect(sections[0]!.items[0]).toContain("50 EUR");
    expect(sections[1]!.items[0]).toContain("not included");
    expect(sections[3]!.items[0]).toBe("Passport required at check-in.");
  });

  test("ignores missing data", () => {
    expect(formatHotelMetapolicy(null, null)).toEqual([]);
  });
});

describe("cancellation periods", () => {
  test("lists every penalty layer in UTC", () => {
    const lines = cancellationPeriods({
      refundable: true,
      freeCancellationUntil: "2026-10-10T09:00:00Z",
      penalties: [
        { startAt: null, endAt: "2026-10-10T09:00:00Z", amount: 0, currency: "NGN" },
        {
          startAt: "2026-10-10T09:00:00Z",
          endAt: "2026-10-12T09:00:00Z",
          amount: 50000,
          currency: "NGN",
        },
        { startAt: "2026-10-12T09:00:00Z", endAt: null, amount: 100000, currency: "NGN" },
      ],
    });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(`Until ${formatUtcDateTime("2026-10-10T09:00:00Z")}: free cancellation`);
    expect(lines[1]).toContain("UTC –");
    expect(lines[2]).toContain("From 12 Oct 2026");
    expect(formatUtcDateTime("2026-10-10T09:00:00Z")).toContain("09:00 UTC");
  });
});
