import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Prose } from "@/components/PageParts";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Amazingfly.ng" },
      {
        name: "description",
        content:
          "The terms that apply when you use Amazingfly.ng and request travel services from Amazingfly Travels.",
      },
      { property: "og:title", content: "Terms of Service | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Terms that apply to Amazingfly.ng and services from Amazingfly Travels.",
      },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description="These terms apply to your use of Amazingfly.ng and to services provided by Amazingfly Travels."
      />
      <Prose>
        <h2>About these terms</h2>
        <p>
          Amazingfly.ng is the website of Amazingfly Travels. By using this website you accept these
          terms. The website currently provides information about our services; online request
          submission and payment are not yet available.
        </p>

        <h2>Nature of our services</h2>
        <p>
          Amazingfly Travels provides assistance, guidance and coordination. We are not an embassy,
          consulate, immigration authority, police force, health authority, airline, hotel or insurance
          underwriter. Decisions, issuance and approvals rest entirely with those bodies.
        </p>

        <h2>Your responsibilities</h2>
        <ul>
          <li>Provide accurate, genuine and complete information and documents.</li>
          <li>Meet deadlines and appointment requirements set by third parties.</li>
          <li>Pay any official or third-party fees that apply to your application.</li>
        </ul>

        <h2>Quotations and pricing</h2>
        <p>
          Amazingfly.ng does not display live fares, live availability or fixed prices. Flight, hotel
          and insurance pricing is confirmed in a quotation prepared after your request is reviewed and
          may change before it is confirmed.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          Amazingfly Travels is not liable for outcomes determined by third parties, including refused
          applications, processing delays, schedule changes or policy decisions.
        </p>
      </Prose>
    </>
  );
}
