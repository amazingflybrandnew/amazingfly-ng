import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, Prose } from "@/components/PageParts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Amazingfly Travels | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Learn about the mission of Amazingfly Travels and the purpose of Amazingfly.ng, our digital platform for Nigerian travellers.",
      },
      { property: "og:title", content: "About Amazingfly Travels | Amazingfly.ng" },
      {
        property: "og:description",
        content: "The mission of Amazingfly Travels and the purpose of Amazingfly.ng.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

function About() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Travel documentation support built for Nigerian travellers"
        description="Amazingfly Travels exists to make visas, travel documentation and travel arrangements clearer, calmer and easier to complete."
      />
      <Prose>
        <h2>Our mission</h2>
        <p>
          Amazingfly Travels is an all-in-one travel documentation, visa assistance and travel booking
          support business. Our mission is to remove the confusion that surrounds travel paperwork so
          that Nigerian travellers can prepare complete, well-organised applications and travel with
          confidence.
        </p>

        <h2>The purpose of Amazingfly.ng</h2>
        <p>
          Amazingfly.ng is the digital platform of Amazingfly Travels. It is where customers learn what
          each service involves, understand what is required of them and start a request. The platform
          is being built in stages. This first stage presents our services, requirements and process
          clearly, so that you know exactly what to expect before you contact us.
        </p>

        <h2>How we work</h2>
        <ul>
          <li>We explain requirements in plain language, specific to your destination.</li>
          <li>We review what you prepare before it is submitted.</li>
          <li>We tell you what we can and cannot do, without overpromising.</li>
          <li>We keep a real person available for your questions.</li>
        </ul>

        <h2>What we do not do</h2>
        <p>
          We do not guarantee visa approvals, we do not act as a government agency and we do not
          fabricate, inflate or misrepresent any document or financial information. Our value is in
          preparation, accuracy and clear guidance.
        </p>

        <div className="flex flex-wrap gap-3 pt-4">
          <Button asChild size="lg">
            <Link to="/request">Start a Request</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/services">Explore Services</Link>
          </Button>
        </div>
      </Prose>
    </>
  );
}
