import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  FileLock2,
  Globe2,
  HeartHandshake,
  ListChecks,
  MessagesSquare,
  Route as RouteIcon,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHero } from "@/components/HomeHero";
import { FeaturedServicesCarousel } from "@/components/FeaturedServicesCarousel";
import { SAMPLE_FEATURED_SERVICES } from "@/lib/featured-services";
import { FlightSearch } from "@/components/FlightSearch";
import { HotelSearch } from "@/components/HotelSearch";

import { Disclaimer } from "@/components/PageParts";
import { services, getService } from "@/data/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Amazingfly.ng | Amazingfly Travels" },
      {
        name: "description",
        content:
          "Amazingfly Travels helps Nigerian travellers with visa assistance, travel documentation, flights, hotels, travel insurance and other essential travel services through Amazingfly.ng.",
      },
      { property: "og:title", content: "Amazingfly.ng | Amazingfly Travels" },
      {
        property: "og:description",
        content:
          "Amazingfly Travels helps Nigerian travellers with visa assistance, travel documentation, flights, hotels, travel insurance and other essential travel services through Amazingfly.ng.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const trustPoints = [
  {
    icon: UserCheck,
    title: "Expert Application Support",
    description:
      "Guidance from a team that works with travel documentation and visa applications every day.",
  },
  {
    icon: FileLock2,
    title: "Secure Document Handling",
    description:
      "Your documents are handled carefully and treated as confidential throughout your request.",
  },
  {
    icon: ListChecks,
    title: "Clear Service Process",
    description: "You always know the next step, what is required and what happens after it.",
  },
  {
    icon: MessagesSquare,
    title: "Human Support When You Need It",
    description: "Real people answer your questions instead of automated replies.",
  },
];

const steps = [
  {
    title: "Choose a Service",
    description: "Select the travel service you need from Amazingfly.ng.",
  },
  {
    title: "Complete Your Details",
    description: "Provide the trip, traveller and document information required for that service.",
  },
  {
    title: "Review Your Request",
    description: "Check your information and review the applicable service fee before continuing.",
  },
  {
    title: "Pay and Continue",
    description: "Complete secure payment and we proceed with processing or supplier booking.",
  },
];

const reasons = [
  { icon: Globe2, text: "Travel support designed for Nigerian travellers" },
  { icon: Sparkles, text: "Multiple travel services in one place" },
  { icon: HeartHandshake, text: "Professional human assistance" },
  { icon: RouteIcon, text: "Clear and transparent service process" },
  { icon: ListChecks, text: "Destination-specific guidance" },
  { icon: MessagesSquare, text: "WhatsApp, email and phone support" },
];

const visaHighlights = [
  "Destination-specific guidance",
  "Document checklist support",
  "Application review",
  "Human assistance",
  "Progress updates once the request system is introduced",
];

function Home() {
  const visa = getService("visa-assistance")!;

  return (
    <>
      {/* Interactive hero */}
      <HomeHero />

      {/* Featured services carousel */}
      <FeaturedServicesCarousel
        items={SAMPLE_FEATURED_SERVICES}
        description="Pick the travel service you need and our specialists will take it from there."
      />

      {/* Direct flight search */}
      <section className="surface-soft">
        <div className="container-page section-y">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Flights</p>
            <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">Find Your Perfect Flight</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Search live routes, fares and cabins, select your preferred flight and continue into
              the dedicated passenger and payment flow.
            </p>
          </div>
          <div className="mt-10">
            <FlightSearch compact />
          </div>
        </div>
      </section>

      {/* Direct hotel search */}
      <section className="container-page section-y">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Hotels</p>
          <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">Find Your Perfect Stay</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Search live hotels by destination and dates, choose an available room and continue into
            the dedicated hotel booking and payment flow.
          </p>
        </div>
        <div className="mt-10">
          <HotelSearch compact />
        </div>
      </section>

      {/* Trust highlights */}
      <section className="container-page section-y">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <div
              key={point.title}
              className="hover-lift rounded-3xl border border-border/70 bg-card p-7 shadow-card"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-tint to-lavender-tint">
                <point.icon className="h-5 w-5 text-orange" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-base font-bold">{point.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{point.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="surface-soft">
        <div className="container-page section-y">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Our services</p>
            <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
              Everything you need for your trip, in one place
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              const isFlight = service.slug === "flights";
              const isHotel = service.slug === "hotels";
              const displayName = isFlight ? "Flights" : isHotel ? "Hotels" : service.name;
              const displayDescription = isFlight
                ? "Search live flight options, select your preferred fare and continue to passenger details and payment."
                : isHotel
                  ? "Search live hotel availability, choose your room and continue through the correct booking and payment flow."
                  : service.shortDescription;

              return (
                <article
                  key={service.slug}
                  className="hover-lift flex flex-col rounded-3xl border border-white/70 bg-white/80 p-7 shadow-card backdrop-blur-sm"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-peach-tint to-coral-tint">
                    <Icon className="h-6 w-6 text-orange" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{displayName}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {displayDescription}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {isFlight ? (
                      <>
                        <Button asChild size="sm" variant="ghost" className="text-navy hover:text-orange">
                          <Link to="/flights">Learn More</Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to="/flights">Search Flights</Link>
                        </Button>
                      </>
                    ) : isHotel ? (
                      <>
                        <Button asChild size="sm" variant="ghost" className="text-navy hover:text-orange">
                          <Link to="/hotels">Learn More</Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to="/hotels">Search Hotels</Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button asChild size="sm" variant="ghost" className="text-navy hover:text-orange">
                          <Link to="/services/$slug" params={{ slug: service.slug }}>
                            Learn More
                          </Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to="/request" search={{ service: service.slug }}>
                            Start a Request
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page section-y">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">How it works</p>
          <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">Four simple steps</h2>
        </div>
        <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-sky to-lavender text-sm font-bold text-white shadow-card">
                {index + 1}
              </span>
              <h3 className="mt-5 text-base font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 max-w-3xl">
          <Disclaimer>
            Flight fares and hotel rates come from live supplier systems and may change until the
            supplier confirms the booking. Other Amazingfly service charges are shown or calculated
            before payment.
          </Disclaimer>
        </div>
      </section>

      {/* Why choose */}
      <section className="surface-dusk text-white">
        <div className="container-page section-y">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-peach">Why us</p>
            <h2 className="mt-4 text-3xl font-extrabold text-white md:text-4xl">
              Why choose Amazingfly Travels
            </h2>
          </div>
          <ul className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason) => (
              <li
                key={reason.text}
                className="flex gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                <reason.icon className="mt-0.5 h-5 w-5 shrink-0 text-peach" aria-hidden="true" />
                <span className="text-sm leading-relaxed text-white/85">{reason.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Visa feature */}
      <section className="container-page section-y">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Main service</p>
            <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">Visa Assistance</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">{visa.introduction}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/request" search={{ service: "visa-assistance" }}>
                  Begin Visa Assistance
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/services/$slug" params={{ slug: "visa-assistance" }}>
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-lift backdrop-blur-sm">
            <ul className="space-y-4">
              {visaHighlights.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Disclaimer>
                Amazingfly Travels provides visa application assistance but does not guarantee visa
                approval.
              </Disclaimer>
            </div>
          </div>
        </div>
      </section>

      {/* Other travel services */}
      <section className="surface-mint">
        <div className="container-page section-y">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold md:text-4xl">Other travel services</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Alongside visa assistance, customers can also access the following support from
              Amazingfly Travels.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <Link
                to="/flights"
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 text-sm font-medium backdrop-blur-sm transition-colors hover:border-sky/40"
              >
                <ArrowRight className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                Flight reservations
              </Link>
            </li>
            <li>
              <Link
                to="/hotels"
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 text-sm font-medium backdrop-blur-sm transition-colors hover:border-sky/40"
              >
                <ArrowRight className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                Hotel reservations
              </Link>
            </li>
            <li>
              <Link
                to="/request"
                search={{ service: "travel-insurance" }}
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 text-sm font-medium backdrop-blur-sm transition-colors hover:border-sky/40"
              >
                <ArrowRight className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                Travel insurance
              </Link>
            </li>
            <li>
              <Link
                to="/request"
                search={{ service: "police-character-certificate" }}
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 text-sm font-medium backdrop-blur-sm transition-colors hover:border-sky/40"
              >
                <ArrowRight className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                Police Character Certificates
              </Link>
            </li>
            <li>
              <Link
                to="/request"
                search={{ service: "yellow-fever-card" }}
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 text-sm font-medium backdrop-blur-sm transition-colors hover:border-sky/40"
              >
                <ArrowRight className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                Yellow Fever Cards
              </Link>
            </li>
            <li>
              <Link
                to="/request"
                search={{ service: "proof-of-funds" }}
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-4 text-sm font-medium backdrop-blur-sm transition-colors hover:border-sky/40"
              >
                <ArrowRight className="h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
                Proof of Funds support
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-page section-y">
        <div className="surface-dusk rounded-[2rem] px-8 py-14 text-center md:px-16 md:py-20">
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            Start Your Travel Request Today
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75">
            Choose the service you need and let the Amazingfly Travels team guide you through the next
            steps on Amazingfly.ng.
          </p>
          <Button asChild size="lg" className="btn-gradient mt-9 border-0 text-white hover:-translate-y-0.5">
            <Link to="/services">Choose a Service</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
