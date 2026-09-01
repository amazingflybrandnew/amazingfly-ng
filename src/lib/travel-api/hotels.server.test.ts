import { afterEach, describe, expect, test } from "bun:test";
import { searchHotels } from "./hotels.server";

const originalFetch = globalThis.fetch;
const originalKeyId = process.env["RATEHAWK_KEY_ID"];
const originalToken = process.env["RATEHAWK_API_TOKEN"];

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKeyId === undefined) delete process.env["RATEHAWK_KEY_ID"];
  else process.env["RATEHAWK_KEY_ID"] = originalKeyId;
  if (originalToken === undefined) delete process.env["RATEHAWK_API_TOKEN"];
  else process.env["RATEHAWK_API_TOKEN"] = originalToken;
});

describe("RateHawk hotel content mapping", () => {
  test("maps Conrad Los Angeles HID 10004834 from Content API metadata", async () => {
    process.env["RATEHAWK_KEY_ID"] = "sandbox-key";
    process.env["RATEHAWK_API_TOKEN"] = "sandbox-token";

    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.endsWith("/api/b2b/v3/search/serp/hotels/")) {
        return Response.json({
          status: "ok",
          data: {
            hotels: [
              {
                hid: 10004834,
                rates: [
                  {
                    book_hash: "h-conrad-test",
                    room_name: "Deluxe room",
                    payment_options: {
                      payment_types: [
                        {
                          type: "deposit",
                          amount: "850",
                          currency_code: "USD",
                          show_amount: "850",
                          show_currency_code: "USD",
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        });
      }

      if (url.endsWith("/api/content/v1/hotel_content_by_ids/")) {
        return Response.json({
          status: "ok",
          data: [
            {
              hid: 10004834,
              id: "conrad_los_angeles",
              name: "Conrad Los Angeles",
              address: "100 South Grand Avenue, Los Angeles",
              star_rating: 5,
              region: { name: "Los Angeles", country_code: "US" },
              images_ext: [{ url: "https://images.example/{size}/conrad.jpg" }],
              amenity_groups: [{ group_name: "General", amenities: ["Wi-Fi"] }],
            },
          ],
        });
      }

      throw new Error(`Unexpected RateHawk request: ${url}`);
    }) as typeof fetch;

    const results = await searchHotels({
      destination: "10004834",
      checkInDate: "2027-02-10",
      checkOutDate: "2027-02-12",
      guests: { adults: 2, children: 0, childAges: [] },
      rooms: 1,
      nationality: "NG",
      currency: "USD",
    });

    expect(requestedUrls).toEqual([
      "https://api-sandbox.ratehawk.com/api/b2b/v3/search/serp/hotels/",
      "https://api-sandbox.ratehawk.com/api/content/v1/hotel_content_by_ids/",
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      hotelId: "hid:10004834",
      hotelName: "Conrad Los Angeles",
      rating: 5,
      location: "Los Angeles",
      address: "100 South Grand Avenue, Los Angeles",
      hotelImage: "https://images.example/640x400/conrad.jpg",
      availability: true,
    });
  });
});
