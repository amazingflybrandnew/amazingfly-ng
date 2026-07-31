import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/PageParts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Start a Request | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Request submission on Amazingfly.ng is coming soon. Contact Amazingfly Travels for immediate assistance with your travel service.",
      },
      { property: "og:title", content: "Start a Request | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Online request submission is coming soon to Amazingfly.ng.",
      },
      { property: "og:url", content: "/request" },
    ],
    links: [{ rel: "canonical", href: "/request" }],
  }),
  component: RequestPlaceholder,
});

function RequestPlaceholder() {
  return (
    <>
      <PageHero eyebrow="Requests" title="Start a Request" />
      <section className="container-page section-y">
        <div className="max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-card md:p-12">
          <p className="text-lg font-semibold leading-relaxed text-navy">
            Request submission will be available shortly. Please contact Amazingfly Travels for
            immediate assistance.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/contact">Contact Support</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/services">Explore Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
