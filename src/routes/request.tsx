import { createFileRoute, redirect } from "@tanstack/react-router";

import { PageHero } from "@/components/PageParts";
import { RequestWizard } from "@/components/RequestWizard";

type RequestSearch = {
  service?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

const FLIGHT_SERVICE_SLUGS = new Set(["flight", "flights", "flight-booking"]);
const HOTEL_SERVICE_SLUGS = new Set(["hotel", "hotels", "hotel-booking"]);

export const Route = createFileRoute("/request")({
  validateSearch: (search: Record<string, unknown>): RequestSearch => ({
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
  },
  head: () => ({
    meta: [
      { title: "Start a Travel Request | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Complete your visa and travel document requests in guided steps and upload your documents securely with Amazingfly Travels. Flights and hotels use their dedicated live search and booking sections.",
      },
      { property: "og:title", content: "Start a Travel Request | Amazingfly.ng" },
      {
        property: "og:description",
        content:
          "A guided travel request journey with secure document upload. Flights and hotels use dedicated booking flows.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/request" }],
  }),
  component: RequestPage,
});

function RequestPage() {
  const { service, from, to } = Route.useSearch();

  return (
    <>
      <PageHero
        eyebrow="Travel requests"
        title="Start a Travel Request"
        description="Choose your service and we will only ask what matters for it — then upload your documents securely and our specialists take it from there. Flights and hotels open their dedicated live search sections."
      />
      <section className="container-page section-y">
        <RequestWizard initialService={service} initialFrom={from} initialTo={to} />
      </section>
    </>
  );
}
