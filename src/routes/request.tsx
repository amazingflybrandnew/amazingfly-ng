import { createFileRoute } from "@tanstack/react-router";

import { PageHero } from "@/components/PageParts";
import { RequestWizard } from "@/components/RequestWizard";

type RequestSearch = {
  service?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

export const Route = createFileRoute("/request")({
  validateSearch: (search: Record<string, unknown>): RequestSearch => ({
    ...(typeof search["service"] === "string" ? { service: search["service"] } : {}),
    ...(typeof search["from"] === "string" ? { from: search["from"] } : {}),
    ...(typeof search["to"] === "string" ? { to: search["to"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Start a Travel Request | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Complete your visa, flight, hotel or travel document request in five guided steps and upload your documents securely with Amazingfly Travels.",
      },
      { property: "og:title", content: "Start a Travel Request | Amazingfly.ng" },
      {
        property: "og:description",
        content: "A guided five-step travel request journey with secure document upload.",
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
        description="Five short steps. Share your travel details, upload your documents securely, and our specialists take it from there."
      />
      <section className="container-page section-y">
        <RequestWizard initialService={service} initialFrom={from} initialTo={to} />
      </section>
    </>
  );
}
