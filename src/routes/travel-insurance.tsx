import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, Prose } from "@/components/PageParts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/travel-insurance")({
  head: () => ({
    meta: [
      { title: "Travel Insurance | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Request travel insurance support for your journey through Amazingfly.ng.",
      },
    ],
  }),
  component: TravelInsurance,
});

function TravelInsurance() {
  return (
    <>
      <PageHero
        eyebrow="Travel Documents"
        title="Travel Insurance Request"
        description="Protect your journey with travel insurance support before you travel."
      />
      <Prose>
        <h2>Request travel insurance</h2>
        <p>
          Complete your travel insurance request with your trip and traveller details. We will guide you
          through the quotation and policy process.
        </p>

        <h2>Information required</h2>
        <ul>
          <li>Destination and travel dates</li>
          <li>Purpose of travel</li>
          <li>Traveller details</li>
          <li>Passport and contact information</li>
          <li>Medical information where required</li>
        </ul>

        <div className="flex flex-wrap gap-3 pt-4">
          <Button asChild size="lg">
            <Link to="/request">Start Travel Insurance Request</Link>
          </Button>
        </div>
      </Prose>
    </>
  );
}
