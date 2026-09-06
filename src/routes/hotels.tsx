import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Disclaimer } from "@/components/PageParts";
import { HotelSearch } from "@/components/HotelSearch";

export const Route = createFileRoute("/hotels")({
  head: () => ({
    meta: [
      { title: "Hotel Search | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Search hotels worldwide by destination, dates, guests and rooms, then let Amazingfly Travels confirm your stay and travel documentation.",
      },
      { property: "og:title", content: "Hotel Search | Amazingfly.ng" },
      {
        property: "og:description",
        content:
          "Compare hotel stays by price, rating, amenities and cancellation policy, then request booking support from Amazingfly Travels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/hotels" },
    ],
    links: [{ rel: "canonical", href: "/hotels" }],
  }),
  component: HotelsPage,
});

function HotelsPage() {
  return (
    <>
      <PageHero
        eyebrow="Hotels"
        title="Find your perfect stay"
        description="Search hotels by destination and dates, compare rooms, ratings and cancellation policies, then hand the booking to the Amazingfly Travels team."
      />
      <section className="container-page section-y">
        <HotelSearch />
        <div className="mt-10 max-w-3xl">
          <Disclaimer>
            Room rates and availability come from accommodation partners and can change before
            confirmation. Amazingfly Travels confirms the final price with you before any payment is
            made.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
