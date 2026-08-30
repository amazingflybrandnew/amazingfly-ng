import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageHero } from "@/components/PageParts";
import { Disclaimer } from "@/components/PageParts";
import { FlightSearch } from "@/components/FlightSearch";

export const Route = createFileRoute("/flights")({
  beforeLoad: () => {
    throw redirect({ to: "/services/$slug", params: { slug: "visa-assistance" } });
  },
  head: () => ({
    meta: [
      { title: "Flight Search | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Search live flight options from Nigeria and worldwide, then let Amazingfly Travels handle the booking and travel documentation.",
      },
      { property: "og:title", content: "Flight Search | Amazingfly.ng" },
      {
        property: "og:description",
        content:
          "Search flights by route, date, passengers and cabin class, then request booking support from Amazingfly Travels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/flights" },
    ],
    links: [{ rel: "canonical", href: "/flights" }],
  }),
  component: FlightsPage,
});

function FlightsPage() {
  return (
    <>
      <PageHero
        eyebrow="Flights"
        title="Find your perfect flight"
        description="Search routes, compare fares and cabins, then hand the booking to the Amazingfly Travels team."
      />
      <section className="container-page section-y">
        <FlightSearch />
        <div className="mt-10 max-w-3xl">
          <Disclaimer>
            Fares and availability come from airline partners and can change before ticketing.
            Amazingfly Travels confirms the final price with you before any payment is made.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
