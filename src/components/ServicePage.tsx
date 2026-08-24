import { Link } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, HelpCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer, PageHero } from "@/components/PageParts";
import type { Service } from "@/data/services";
import { ITINERARY_NOTE, PROCESSING_FAQ } from "@/lib/catalogue/visa-catalogue";

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Users;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-card">
      <Icon className="h-6 w-6 text-orange" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <Bullets items={items} />
    </div>
  );
}

function PrimaryServiceLink({
  service,
  className,
}: {
  service: Service;
  className?: string;
}) {
  if (service.slug === "flights") {
    return (
      <Link to="/flights" className={className}>
        {service.ctaLabel}
      </Link>
    );
  }
  if (service.slug === "hotels") {
    return (
      <Link to="/hotels" className={className}>
        {service.ctaLabel}
      </Link>
    );
  }
  return (
    <Link to="/request" search={{ service: service.slug }} className={className}>
      {service.ctaLabel}
    </Link>
  );
}

export function ServicePage({ service }: { service: Service }) {
  const Icon = service.icon;

  return (
    <>
      <PageHero eyebrow={service.status} title={service.name} description={service.introduction}>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <PrimaryServiceLink service={service} />
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/contact">Contact Support</Link>
          </Button>
        </div>
      </PageHero>

      <section className="container-page section-y">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-tint">
                <Icon className="h-6 w-6 text-orange" aria-hidden="true" />
              </span>
              <h2 className="text-2xl font-bold">Service overview</h2>
            </div>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {service.shortDescription}
            </p>
            <Bullets items={service.benefits} />
          </div>
          <div className="grid gap-6">
            <Card icon={Users} title="Who this service is for" items={service.whoItIsFor} />
            <Card icon={ClipboardList} title="What you receive" items={service.whatYouReceive} />
          </div>
        </div>
      </section>

      <section className="bg-navy-tint">
        <div className="container-page section-y grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Initial requirements</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Have these ready before you start your request.
            </p>
            <Bullets items={service.initialRequirements} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">How the process works</h2>
            <ol className="mt-5 space-y-5">
              {service.processSteps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="container-page section-y">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-orange" aria-hidden="true" />
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {[...service.faqs, ...PROCESSING_FAQ].map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-base font-bold">{faq.question}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-3xl space-y-4">
          <Disclaimer>{service.disclaimer}</Disclaimer>
          <Disclaimer>
            Visa processing times displayed are estimated timelines. Processing may take longer due
            to embassy appointment availability, embassy delays, public holidays, additional
            document requests, or circumstances outside Amazingfly Travels&apos; control.
          </Disclaimer>
          <Disclaimer>{ITINERARY_NOTE}</Disclaimer>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <PrimaryServiceLink service={service} />
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/contact">Contact Support</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
