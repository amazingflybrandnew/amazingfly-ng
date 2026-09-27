import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const originalFetch = globalThis.fetch;
const SUPABASE = "https://safety.supabase.test";

beforeEach(() => {
  process.env["EXTERNAL_SUPABASE_URL"] = SUPABASE;
  process.env["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY"] = "service-role-test";
  process.env["RATEHAWK_KEY_ID"] = "k";
  process.env["RATEHAWK_API_TOKEN"] = "t";
  process.env["PAYSTACK_SECRET_KEY"] = "sk_test_x";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env["EXTERNAL_SUPABASE_URL"];
  delete process.env["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY"];
  delete process.env["PAYSTACK_SECRET_KEY"];
});

type Call = { method: string; url: string; body: string };

function fakeBackend(handlers: (call: Call) => Response | undefined) {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const body = typeof init?.body === "string" ? init.body : "";
    const call = { method, url, body };
    calls.push(call);
    const response = handlers(call);
    if (response) return response;
    // Default: empty success for any other Supabase table access.
    if (url.startsWith(SUPABASE)) return Response.json([]);
    throw new Error(`Unexpected request: ${method} ${url}`);
  }) as typeof fetch;
  return calls;
}

const REQUEST_ROW = {
  id: "req-1",
  service_category: "hotels",
  service_type: "Hotel Booking",
  hotel_book_hash: "p-hash",
  hotel_payment_type: "deposit",
  hotel_payment_requires_card: false,
  hotel_rooms: 1,
  hotel_guests: 1,
  email: "guest@example.com",
  phone: "+2348000000000",
  hotel_provider_payment_amount: 104,
  hotel_provider_payment_currency: "USD",
};

describe("pre-payment hotel reservation", () => {
  test("blocks payment when RateHawk says the rate is gone", async () => {
    const calls = fakeBackend(({ url }) => {
      if (url.includes("/rest/v1/service_requests")) return Response.json([REQUEST_ROW]);
      if (url.includes("/rest/v1/booking_passengers")) {
        return Response.json([{ first_name: "Ada", last_name: "Obi" }]);
      }
      if (url.endsWith("/hotel/order/booking/form/")) {
        return Response.json({ status: "error", error: "rate_not_found", data: null });
      }
      return undefined;
    });
    const { reserveHotelBeforePayment } = await import("../travel-api/hotel-booking.server");
    const result = await reserveHotelBeforePayment("req-1", "203.0.113.5");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain("You have not been charged");
    // No refund was attempted: nothing was paid.
    expect(calls.some((c) => c.url.includes("api.paystack.co"))).toBe(false);
  });

  test("allows payment when the reservation succeeds at the quoted price", async () => {
    fakeBackend(({ url }) => {
      if (url.includes("/rest/v1/service_requests")) return Response.json([REQUEST_ROW]);
      if (url.includes("/rest/v1/booking_passengers")) {
        return Response.json([{ first_name: "Ada", last_name: "Obi" }]);
      }
      if (url.endsWith("/hotel/order/booking/form/")) {
        return Response.json({
          status: "ok",
          data: {
            order_id: 555,
            item_id: 1,
            payment_types: [{ type: "deposit", amount: "104.00", currency_code: "USD" }],
          },
        });
      }
      return undefined;
    });
    const { reserveHotelBeforePayment } = await import("../travel-api/hotel-booking.server");
    const result = await reserveHotelBeforePayment("req-1", "203.0.113.5");
    expect(result.ok).toBe(true);
  });

  test("blocks payment when the supplier price rose", async () => {
    fakeBackend(({ url }) => {
      if (url.includes("/rest/v1/service_requests")) return Response.json([REQUEST_ROW]);
      if (url.includes("/rest/v1/booking_passengers")) {
        return Response.json([{ first_name: "Ada", last_name: "Obi" }]);
      }
      if (url.endsWith("/hotel/order/booking/form/")) {
        return Response.json({
          status: "ok",
          data: {
            order_id: 556,
            payment_types: [{ type: "deposit", amount: "130.00", currency_code: "USD" }],
          },
        });
      }
      return undefined;
    });
    const { reserveHotelBeforePayment } = await import("../travel-api/hotel-booking.server");
    const result = await reserveHotelBeforePayment("req-1", "203.0.113.5");
    expect(result.ok).toBe(false);
  });
});

describe("automatic refund", () => {
  test("refunds once when the claim succeeds", async () => {
    const calls = fakeBackend(({ method, url }) => {
      if (method === "PATCH" && url.includes("/rest/v1/service_requests")) {
        return Response.json([{ id: "req-1" }]);
      }
      if (url.includes("/rest/v1/payment_transactions") && method === "GET") {
        return Response.json([
          {
            id: "tx-1",
            transaction_reference: "AFP-1",
            amount: 1000,
            currency: "NGN",
            provider_response: {},
          },
        ]);
      }
      if (url === "https://api.paystack.co/refund") {
        return Response.json({ status: true, data: { status: "pending" } });
      }
      return undefined;
    });
    const { refundFailedPaidHotelBooking } = await import("./hotel-refund.server");
    await refundFailedPaidHotelBooking("req-1", "rate_not_found");
    const refunds = calls.filter((c) => c.url === "https://api.paystack.co/refund");
    expect(refunds).toHaveLength(1);
    expect(JSON.parse(refunds[0]!.body)).toEqual({ transaction: "AFP-1" });
  });

  test("does not refund when the request was not paid or already refunded", async () => {
    const calls = fakeBackend(({ method, url }) => {
      if (method === "PATCH" && url.includes("/rest/v1/service_requests")) return Response.json([]);
      return undefined;
    });
    const { refundFailedPaidHotelBooking } = await import("./hotel-refund.server");
    await refundFailedPaidHotelBooking("req-1", "rate_not_found");
    expect(calls.some((c) => c.url.includes("api.paystack.co"))).toBe(false);
  });
});

describe("post-payment finish", () => {
  test("a second concurrent caller does not finish the reserved booking again", async () => {
    const calls = fakeBackend(({ method, url }) => {
      if (url.includes("/rest/v1/hotel_bookings") && method === "GET") {
        return Response.json([
          {
            partner_order_id: "po-1",
            status: "created",
            order_id: "555",
            payload: { payment_types: [{ type: "deposit", amount: "104", currencyCode: "USD" }] },
            created_at: new Date().toISOString(),
          },
        ]);
      }
      // The other caller already claimed it: the conditional update matches nothing.
      if (url.includes("/rest/v1/hotel_bookings") && method === "PATCH") return Response.json([]);
      if (url.includes("/rest/v1/service_requests")) return Response.json([REQUEST_ROW]);
      if (url.includes("/rest/v1/booking_passengers")) {
        return Response.json([{ first_name: "Ada", last_name: "Obi" }]);
      }
      return undefined;
    });
    const { bookStoredHotelRequest } = await import("../travel-api/hotel-booking.server");
    const result = await bookStoredHotelRequest("req-1", "deposit", null, "203.0.113.5");
    expect(result.status).toBe("started");
    expect(calls.some((c) => c.url.includes("ratehawk.com"))).toBe(false);
    expect(calls.some((c) => c.url.includes("api.paystack.co"))).toBe(false);
  });
});

describe("fresh prebook before reservation", () => {
  test("re-prebooks the hotelpage hash and reserves with the fresh prebook hash", async () => {
    const calls = fakeBackend(({ url }) => {
      if (url.includes("/rest/v1/service_requests")) {
        return Response.json([{ ...REQUEST_ROW, hotel_search_book_hash: "h-search" }]);
      }
      if (url.includes("/rest/v1/booking_passengers")) {
        return Response.json([{ first_name: "Ada", last_name: "Obi" }]);
      }
      if (url.endsWith("/hotel/prebook/")) {
        return Response.json({
          status: "ok",
          data: { hotels: [{ rates: [{ book_hash: "p-fresh" }] }] },
        });
      }
      if (url.endsWith("/hotel/order/booking/form/")) {
        return Response.json({
          status: "ok",
          data: {
            order_id: 777,
            payment_types: [{ type: "deposit", amount: "104.00", currency_code: "USD" }],
          },
        });
      }
      return undefined;
    });
    const { reserveHotelBeforePayment } = await import("../travel-api/hotel-booking.server");
    const result = await reserveHotelBeforePayment("req-1", "203.0.113.5");
    expect(result.ok).toBe(true);
    const prebook = calls.find((c) => c.url.endsWith("/hotel/prebook/"))!;
    expect(JSON.parse(prebook.body).hash).toBe("h-search");
    const form = calls.find((c) => c.url.endsWith("/hotel/order/booking/form/"))!;
    expect(JSON.parse(form.body).book_hash).toBe("p-fresh");
  });
});
