import { afterEach, describe, expect, test } from "bun:test";
import { matchRoomGroup, searchHotels } from "./hotels.server";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const suiteRgExt = {
  class: 5,
  quality: 0,
  sex: 0,
  bathroom: 2,
  bedding: 3,
  family: 0,
  capacity: 2,
};

describe("rg_ext room matching", () => {
  test("matches only when every rg_ext field is equal", () => {
    const groups = [{ name: "Suite", rg_ext: suiteRgExt }];
    expect(matchRoomGroup(suiteRgExt, groups)?.name).toBe("Suite");
    expect(matchRoomGroup({ ...suiteRgExt, bedding: 4 }, groups)).toBeNull();
    // A missing field counts as 0 on both sides.
    expect(matchRoomGroup({ ...suiteRgExt, club: 0 }, groups)?.name).toBe("Suite");
    expect(matchRoomGroup(undefined, groups)).toBeNull();
  });

  test("uses room group photos/amenities on match and rate data otherwise", async () => {
    process.env["RATEHAWK_KEY_ID"] = "k";
    process.env["RATEHAWK_API_TOKEN"] = "t";
    globalThis.fetch = (async (input) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith("/search/serp/hotels/")) {
        return Response.json({
          status: "ok",
          data: {
            hotels: [
              {
                hid: 1234567,
                rates: [
                  {
                    book_hash: "matched",
                    room_name: "Junior Suite",
                    rg_ext: suiteRgExt,
                    room_data_trans: { main_room_type: "Junior Suite", bedding_type: "double bed" },
                    payment_options: {
                      payment_types: [{ type: "deposit", amount: "100", currency_code: "USD" }],
                    },
                  },
                  {
                    book_hash: "unmatched",
                    room_name: "Standard Room",
                    rg_ext: { ...suiteRgExt, class: 3 },
                    amenities_data: ["air-conditioning", "window"],
                    room_data_trans: { main_room_type: "Standard", bedding_type: "twin beds" },
                    payment_options: {
                      payment_types: [{ type: "deposit", amount: "80", currency_code: "USD" }],
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
              hid: 1234567,
              name: "Test Hotel",
              check_in_time: "14:00:00",
              room_groups: [
                {
                  name: "Junior Suite",
                  rg_ext: suiteRgExt,
                  images: ["https://img.example/{size}/suite.jpg"],
                  room_amenities: ["balcony", "sea-view"],
                  name_struct: { main_name: "Junior Suite", bedding_type: "king bed" },
                },
              ],
            },
          ],
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;

    const [hotel] = await searchHotels({
      destination: "1234567",
      checkInDate: "2027-03-10",
      checkOutDate: "2027-03-12",
      guests: { adults: 2, children: 0, childAges: [] },
      rooms: 1,
      currency: "USD",
    });
    const matched = hotel!.rooms.find((room) => room.bookHash === "matched")!;
    const unmatched = hotel!.rooms.find((room) => room.bookHash === "unmatched")!;

    expect(matched.images).toEqual(["https://img.example/640x400/suite.jpg"]);
    expect(matched.amenities).toEqual(["Balcony", "Sea view"]);
    expect(matched.bedType).toBe("King bed");
    expect(matched.capacity).toBe(2);

    expect(unmatched.images).toBeUndefined();
    expect(unmatched.amenities).toEqual(["Air conditioning", "Window"]);
    expect(unmatched.bedType).toBe("Twin beds");
    expect(unmatched.roomType).toBe("Standard");
  });
});

describe("transient search errors", () => {
  test("retries a core_search_error once", async () => {
    process.env["RATEHAWK_KEY_ID"] = "k";
    process.env["RATEHAWK_API_TOKEN"] = "t";
    let serpCalls = 0;
    globalThis.fetch = (async (input) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith("/search/serp/hotels/")) {
        serpCalls += 1;
        if (serpCalls === 1) {
          return Response.json({ status: "error", error: "core_search_error", data: null });
        }
        return Response.json({ status: "ok", data: { hotels: [] } });
      }
      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;

    const results = await searchHotels({
      destination: "1234567",
      checkInDate: "2027-03-10",
      checkOutDate: "2027-03-12",
      guests: { adults: 2, children: 0, childAges: [] },
      rooms: 1,
      currency: "USD",
    });
    expect(results).toEqual([]);
    expect(serpCalls).toBe(2);
  });
});
