import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { PageHero } from "@/components/PageParts";
import { RequestWizard } from "@/components/RequestWizard";
import { useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";

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
  const { data: session, isPending } = useSessionQuery();
  const redirectParams = new URLSearchParams();
  if (service) redirectParams.set("service", service);
  if (from) redirectParams.set("from", from);
  if (to) redirectParams.set("to", to);
  const redirectTarget = `/request${redirectParams.size ? `?${redirectParams.toString()}` : ""}`;

  return (
    <>
      <PageHero
        eyebrow="Travel requests"
        title="Start a Travel Request"
        description="Choose your service and we will only ask what matters for it — then upload your documents securely and our specialists take it from there. Flights and hotels open their dedicated live search sections."
      />
      <section className="container-page section-y">
        {isPending ? (
          <div className="flex min-h-64 items-center justify-center" aria-label="Checking your account">
            <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
          </div>
        ) : !session?.user ? (
          <div className="glass-card mx-auto max-w-lg rounded-3xl p-8 text-center md:p-10">
            <h2 className="text-2xl font-extrabold text-navy">Sign in to start your request</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Create an Amazingfly account or sign in to submit your travel request, upload
              documents securely and track every update.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg" className="btn-gradient text-white">
                <Link to="/auth" search={{ redirect: redirectTarget, mode: "signup" }}>
                  Create account
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth" search={{ redirect: redirectTarget }}>
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <RequestWizard initialService={service} initialFrom={from} initialTo={to} />
        )}
      </section>
    </>
  );
}
