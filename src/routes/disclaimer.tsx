import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Prose } from "@/components/PageParts";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Important disclaimers about visa assistance, quotations, financial documentation and government-issued documents at Amazingfly Travels.",
      },
      { property: "og:title", content: "Disclaimer | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Important disclaimers covering the services provided by Amazingfly Travels.",
      },
      { property: "og:url", content: "/disclaimer" },
    ],
    links: [{ rel: "canonical", href: "/disclaimer" }],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Disclaimer"
        description="Please read these statements carefully before requesting any service from Amazingfly Travels."
      />
      <Prose>
        <h2>Visa assistance</h2>
        <p>
          Amazingfly Travels provides visa application assistance but does not guarantee visa approval.
          All decisions are made by the relevant embassy, consulate or immigration authority.
        </p>

        <h2>Flights and hotels</h2>
        <p>
          Amazingfly.ng does not display live fares, live availability, reservations or booking
          confirmations. Flight and hotel support operates through a request-and-quotation process.
        </p>

        <h2>Travel insurance</h2>
        <p>
          Amazingfly Travels is not an insurance underwriter. Available policies, coverage and final
          pricing are confirmed after a request is submitted. Policies are not issued automatically.
        </p>

        <h2>Proof of funds</h2>
        <p>
          Amazingfly Travels assists customers with organising and presenting genuine, verifiable
          financial documentation. We do not fabricate, inflate or misrepresent financial information.
        </p>

        <h2>Police character certificate and yellow fever card</h2>
        <p>
          Amazingfly Travels is not the Nigeria Police Force, the NCDC, Port Health Services or any
          other government agency. These are assistance services only; we do not issue certificates or
          vaccination cards and we cannot influence issuance decisions or timelines.
        </p>

        <h2>Website information</h2>
        <p>
          Information on Amazingfly.ng is provided for general guidance. Requirements change frequently
          and vary by destination, so always confirm the current requirements for your specific
          application with us before you proceed.
        </p>
      </Prose>
    </>
  );
}
