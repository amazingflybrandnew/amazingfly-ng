import { createFileRoute, redirect } from "@tanstack/react-router";

type StartRequestSearch = {
  service?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

const FLIGHT_SERVICE_SLUGS = new Set(["flight", "flights", "flight-booking"]);
const HOTEL_SERVICE_SLUGS = new Set(["hotel", "hotels", "hotel-booking"]);

export const Route = createFileRoute("/start-request")({
  validateSearch: (search: Record<string, unknown>): StartRequestSearch => ({
    ...(typeof search["service"] === "string" ? { service: search["service"] } : {}),
    ...(typeof search["from"] === "string" ? { from: search["from"] } : {}),
    ...(typeof search["to"] === "string" ? { to: search["to"] } : {}),
  }),
  beforeLoad: ({ search }) => {
    const service = search.service?.trim().toLowerCase();

    if (service && FLIGHT_SERVICE_SLUGS.has(service)) {
      throw redirect({ to: "/flights" });
    }

    if (service && HOTEL_SERVICE_SLUGS.has(service)) {
      throw redirect({ to: "/hotels" });
    }

    throw redirect({
      to: "/request",
      search: {
        ...(search.service ? { service: search.service } : {}),
        ...(search.from ? { from: search.from } : {}),
        ...(search.to ? { to: search.to } : {}),
      },
    });
  },
});
