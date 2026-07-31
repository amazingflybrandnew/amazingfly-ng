import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/PageParts";
import { Button } from "@/components/ui/button";
import { services } from "@/data/services";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Travel Services | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Explore the travel services offered by Amazingfly Travels: visa assistance, flights, hotels, travel insurance, proof of funds guidance and more.",
      },
      { property: "og:title", content: "Travel Services | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Visa assistance, flights, hotels, travel insurance and travel documentation support.",
      },
      { property: "og:url", content: "/services" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesIndex,
});

function ServicesIndex() {
  return (
    <>
      <PageHero
        eyebrow="Our services"
        title="Travel services from Amazingfly Travels"
        description="Everything Nigerian travellers need for visas, travel documentation and travel arrangements, handled by real people."
      />
      <section className="container-page section-y">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article
                key={service.slug}
                className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-card transition-shadow hover:shadow-lift"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-tint">
                  <Icon className="h-6 w-6 text-orange" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-lg font-bold">{service.name}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {service.shortDescription}
                </p>
                <Link
                  to="/services/$slug"
                  params={{ slug: service.slug }}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange hover:underline"
                >
                  Learn More <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
        <div className="mt-12">
          <Button asChild size="lg">
            <Link to="/request">Start a Request</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
