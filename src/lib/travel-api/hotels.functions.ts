import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toHotelRequest } from "./hotel-stay";
import type {
  HotelPaymentOption,
  HotelResult,
  HotelSearchResponse,
  RoomResult,
} from "./hotel.types";

const HOTEL_INFO_TIMEOUT_MS = 5_000;
const HOTEL_ROOMS_TIMEOUT_MS = 18_000;
const CUSTOMER_HOTEL_CURRENCY = "NGN";

async function convertHotelAmount(amount: number, currency: string) {
  if (amount === 0) return 0;
  const { resolveCustomerCharge } = await import("@/lib/payment/currency.server");
  const result = await resolveCustomerCharge(amount, currency, true);
  if (!result.ok) throw new Error(result.message);
  return result.conversion.amount;
}

async function localizePaymentOption(option: HotelPaymentOption): Promise<HotelPaymentOption> {
  const displayAmount = option.showAmount || option.amount;
  const displayCurrency = option.showCurrency || option.currency;
  return {
    ...option,
    showAmount: await convertHotelAmount(displayAmount, displayCurrency),
    showCurrency: CUSTOMER_HOTEL_CURRENCY,
  };
}

async function localizeRoom(room: RoomResult): Promise<RoomResult> {
  const [price, paymentOptions] = await Promise.all([
    convertHotelAmount(room.price, room.currency),
    Promise.all(room.paymentOptions.map(localizePaymentOption)),
  ]);
  return {
    ...room,
    providerPrice: room.providerPrice ?? room.price,
    providerCurrency: room.providerCurrency ?? room.currency,
    price,
    currency: CUSTOMER_HOTEL_CURRENCY,
    paymentOptions,
  };
}

async function localizeHotel(hotel: HotelResult): Promise<HotelResult> {
  const rooms = await Promise.all(hotel.rooms.map(localizeRoom));
  const cheapest = rooms.length
    ? rooms.reduce((lowest, room) => (room.price < lowest.price ? room : lowest), rooms[0]!)
    : null;
  const price = cheapest
    ? cheapest.price
    : await convertHotelAmount(hotel.price, hotel.currency);
  return {
    ...hotel,
    providerPrice: hotel.providerPrice ?? hotel.price,
    providerCurrency: hotel.providerCurrency ?? hotel.currency,
    rooms,
    price,
    currency: CUSTOMER_HOTEL_CURRENCY,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

const guestsInput = z
  .object({
    adults: z.number().int().min(1).max(12),
    children: z.number().int().min(0).max(8).default(0),
    childAges: z.array(z.number().int().min(0).max(17)).max(8).optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.childAges?.length ?? 0) !== value.children) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["childAges"],
        message: "Please provide the age of every child.",
      });
    }
  });

const stayInput = z
  .object({
    destination: z.string().trim().min(2).max(80),
    checkInDate: z.string().trim().min(8).max(32),
    checkOutDate: z.string().trim().min(8).max(32),
    guests: guestsInput,
    rooms: z.number().int().min(1).max(8),
    nationality: z.string().trim().min(2).max(2).optional(),
    currency: z.string().trim().min(3).max(3).optional(),
  })
  .strict();

const detailsInput = z
  .object({
    hotelId: z.string().trim().min(1).max(120),
    stay: stayInput,
  })
  .strict();

export type HotelDetailsPayload =
  | {
      ok: true;
      hotel: (HotelResult & { description: string; policies: string }) | null;
      rooms: RoomResult[];
    }
  | { ok: false; error: string };

export type HotelRoomsPayload =
  | { ok: true; rooms: RoomResult[] }
  | { ok: false; error: string };

export const searchHotelStays = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => stayInput.parse(data))
  .handler(async ({ data }): Promise<HotelSearchResponse> => {
    const { searchHotels } = await import("./hotels.server");
    try {
      const providerResults = await searchHotels(toHotelRequest(data));
      const results = await Promise.all(providerResults.map(localizeHotel));
      return { ok: true, results };
    } catch (error) {
      console.error("[Hotels] search failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to search hotels right now.",
      };
    }
  });

export const getVisaHotelStayRooms = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => detailsInput.parse(data))
  .handler(async ({ data }): Promise<HotelRoomsPayload> => {
    const { getHotelRooms } = await import("./hotels.server");
    try {
      const providerRooms = await withTimeout(
        getHotelRooms(data.hotelId, toHotelRequest(data.stay)),
        HOTEL_ROOMS_TIMEOUT_MS,
        "Live bookable room availability is taking too long. Please try this hotel again or choose another hotel.",
      );
      const rooms = await Promise.all(providerRooms.map(localizeRoom));
      return { ok: true, rooms };
    } catch (error) {
      console.error("[Visa hotel] room lookup failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load live bookable rooms right now.",
      };
    }
  });

export const getHotelStayDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => detailsInput.parse(data))
  .handler(async ({ data }): Promise<HotelDetailsPayload> => {
    const { getHotelDetails, getHotelRooms } = await import("./hotels.server");
    try {
      // Room availability is the critical response for this action. Do not let
      // the optional static hotel-info request hold the whole UI open forever.
      const hotelPromise = withTimeout(
        getHotelDetails(data.hotelId),
        HOTEL_INFO_TIMEOUT_MS,
        "Hotel information took too long to load.",
      ).catch(() => null);

      const providerRooms = await withTimeout(
        getHotelRooms(data.hotelId, toHotelRequest(data.stay)),
        HOTEL_ROOMS_TIMEOUT_MS,
        "Room availability is taking too long. Please try this hotel again or choose another hotel.",
      );

      const rooms = await Promise.all(providerRooms.map(localizeRoom));
      const providerHotel = await hotelPromise;
      const hotel = providerHotel
        ? { ...providerHotel, currency: CUSTOMER_HOTEL_CURRENCY }
        : null;
      return { ok: true, hotel, rooms };
    } catch (error) {
      console.error("[Hotels] details failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load this hotel right now.",
      };
    }
  });

const prebookInput = z
  .object({
    bookHash: z.string().trim().min(1).max(2000),
    expectedPrice: z.number().nonnegative(),
    expectedCurrency: z.string().trim().min(3).max(3),
  })
  .strict();

export type HotelPrebookPayload =
  | { ok: true; status: "available"; room: RoomResult }
  | { ok: true; status: "price_changed"; room: RoomResult; previousPrice: number }
  | { ok: false; error: string };

export const prebookHotelStayRate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => prebookInput.parse(data))
  .handler(async ({ data }): Promise<HotelPrebookPayload> => {
    const { prebookHotelRate } = await import("./hotels.server");
    try {
      const outcome = await prebookHotelRate(
        data.bookHash,
        data.expectedPrice,
        data.expectedCurrency,
      );
      if (outcome.status === "unavailable") return { ok: false, error: outcome.message };
      if (outcome.status === "price_changed") {
        const [room, previousPrice] = await Promise.all([
          localizeRoom(outcome.room),
          convertHotelAmount(outcome.previousPrice, data.expectedCurrency),
        ]);
        return {
          ok: true,
          status: "price_changed",
          room,
          previousPrice,
        };
      }
      return { ok: true, status: "available", room: await localizeRoom(outcome.room) };
    } catch (error) {
      console.error("[Hotels] prebook failed", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "We could not confirm this rate.",
      };
    }
  });
