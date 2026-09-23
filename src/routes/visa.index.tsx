import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Globe2, MapPin } from "lucide-react";

import { PageHero } from "@/components/PageParts";
import { visaDestinationsByRegion, type VisaDestination } from "@/lib/visa/destinations";

export const Route = createFileRoute("/visa/")({
  head: () => {
    const title = "Visa Destinations from Nigeria | Amazingfly.ng";
    const description =
      "Browse every country Amazingfly handles — visa applications submitted in Nigeria (VFS Global, TLScontact) and e-Visas you can apply for online. Tap a country for full requirements.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: "/visa" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: "/visa" }],
    };
  },
  component: VisaIndexPage,
});

function DestinationCard({ destination }: { destination: VisaDestination }) {
  return (
    <Link
      to="/visa/$slug"
      params={{ slug: destination.slug }}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-white/80 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-card"
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {destination.flag}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-navy">{destination.name}</span>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {destination.route === "evisa"
            ? "e-Visa · online"
            : destination.centre === "US Embassy"
              ? "Embassy interview"
              : `${destination.centre} · Nigeria`}
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-navy"
        aria-hidden="true"
      />
    </Link>
  );
}

function Section({
  icon: Icon,
  title,
  blurb,
  route,
}: {
  icon: typeof MapPin;
  title: string;
  blurb: string;
  route: "submission" | "evisa";
}) {
  const groups = visaDestinationsByRegion(route);
  return (
    <section className="mt-14 first:mt-0">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy-tint">
          <Icon className="h-5 w-5 text-navy" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-extrabold text-navy">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{blurb}</p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <div key={group.region}>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {group.region}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((destination) => (
                <DestinationCard key={destination.slug} destination={destination} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function VisaIndexPage() {
  return (
    <>
      <PageHero
        eyebrow="Visa services"
        title="Where do you want to go?"
        description="These are the destinations Amazingfly handles for Nigerian travellers — visas you submit at a centre in Nigeria, and e-Visas you can apply for online. Tap any country for its full requirements."
      />

      <div className="container-page section-y">
        <Section
          icon={MapPin}
          title="Submit your application in Nigeria"
          blurb="Lodge your documents and biometrics at a VFS Global or TLScontact centre in Nigeria (or the embassy for the USA). Tap a country for the full requirements checklist."
          route="submission"
        />
        <Section
          icon={Globe2}
          title="Apply online — e-Visa"
          blurb="Nigerian passport holders can apply for these entirely online. Amazingfly completes and submits your application on the official government portal."
          route="evisa"
        />
      </div>
    </>
  );
}
