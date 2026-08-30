import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/PageParts";
import { Button } from "@/components/ui/button";
import { publicServices } from "@/data/services";
import { SERVICE_CATEGORY_GROUPS } from "@/lib/catalogue/service-categories";
import { packageDestinations, packagesFor } from "@/lib/catalogue/visa-catalogue";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Travel Services | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Explore visa assistance, travel insurance, proof of funds guidance and other travel documentation services from Amazingfly Travels.",
      },
      { property: "og:title", content: "Travel Services | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Visa assistance, travel insurance and travel documentation support.",
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
          {publicServices.map((service) => {
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
        <div className="mt-16">
          <h2 className="text-2xl font-extrabold text-navy">Service categories and packages</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every service is organised into clear packages. Choose your category, then your
            destination, then the package that fits your trip.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATEGORY_GROUPS.map((group) => {
              const destinations = packageDestinations(group.key);
              const count = packagesFor(group.key).length;
              return (
                <article
                  key={group.key}
                  className="rounded-2xl border border-border bg-card p-6 shadow-card"
                >
                  <h3 className="text-base font-bold text-navy">{group.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {group.description}
                  </p>
                  <p className="mt-3 text-sm text-navy-soft">{group.explanation}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {count > 0
                      ? `${count} package${count === 1 ? "" : "s"}${
                          group.hasDestination && destinations.length
                            ? ` · ${destinations.length} destination${destinations.length === 1 ? "" : "s"}`
                            : ""
                        }`
                      : "Priced with your specialist"}
                  </p>
                  <Link
                    to="/request"
                    search={{ service: group.serviceSlug }}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange hover:underline"
                  >
                    Choose a package <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
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
