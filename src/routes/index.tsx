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
import { SearchBookTravel } from "@/components/SearchBookTravel";
import { SAMPLE_FEATURED_SERVICES } from "@/lib/featured-services";

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
  "Request progress updates",
];

function Home() {
  const visa = getService("visa-assistance")!;

  return (
    <>
      <HomeHero />

      <FeaturedServicesCarousel
        items={SAMPLE_FEATURED_SERVICES}
        description="Pick the travel service you need and our specialists will take it from there."
      />

      <SearchBookTravel />

      <section className="bg-[#f7fbff]">
        <div className="container-page section-y">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((point, index) => (
              <div
                key={point.title}
                className="hover-lift rounded-3xl border border-[#1268d8]/10 bg-white p-7 shadow-[0_18px_42px_-32px_rgba(18,60,115,0.5)]"
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl ${
                    index % 2 === 0
                      ? "bg-[linear-gradient(135deg,_#dbeafe_0%,_#bfdbfe_100%)]"
                      : "bg-[linear-gradient(135deg,_#ffedd5_0%,_#fed7aa_100%)]"
                  }`}
                >
                  <point.icon
                    className={`h-5 w-5 ${index % 2 === 0 ? "text-[#0756c7]" : "text-[#e95516]"}`}
                    aria-hidden="true"
                  />
                </span>
                <h2 className="mt-5 text-base font-extrabold text-[#123c73]">{point.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5b7189]">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(145deg,_#eef5ff_0%,_#f4eeff_44%,_#fff1e6_100%)]">
        <div className="pointer-events-none absolute left-[45%] top-8 h-72 w-72 rounded-full bg-[#6b4bd4]/10 blur-3xl" />
        <div className="container-page section-y relative">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e95516]">Our services</p>
            <h2 className="mt-4 text-3xl font-extrabold text-[#123c73] md:text-4xl">
              Everything you need for your trip, in one place
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => {
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
                  className="hover-lift flex flex-col rounded-3xl border border-white/90 bg-white/95 p-7 shadow-[0_20px_50px_-36px_rgba(18,60,115,0.55)] backdrop-blur-sm"
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl ${
                      index % 3 === 0
                        ? "bg-[linear-gradient(135deg,_#dbeafe_0%,_#bfdbfe_100%)]"
                        : index % 3 === 1
                          ? "bg-[linear-gradient(135deg,_#ffedd5_0%,_#fed7aa_100%)]"
                          : "bg-[linear-gradient(135deg,_#d1fae5_0%,_#bfdbfe_100%)]"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        index % 3 === 0 ? "text-[#0756c7]" : index % 3 === 1 ? "text-[#e95516]" : "text-[#128565]"
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold text-[#123c73]">{displayName}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[#5a7087]">
                    {displayDescription}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {isFlight ? (
                      <>
                        <Button asChild size="sm" variant="ghost" className="text-[#123c73] hover:text-[#0756c7]">
                          <Link to="/flights">Learn More</Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to="/flights">Search Flights</Link>
                        </Button>
                      </>
                    ) : isHotel ? (
                      <>
                        <Button asChild size="sm" variant="ghost" className="text-[#123c73] hover:text-[#e95516]">
                          <Link to="/hotels">Learn More</Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to="/hotels">Search Hotels</Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button asChild size="sm" variant="ghost" className="text-[#123c73] hover:text-[#e95516]">
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

      <section className="bg-white">
        <div className="container-page section-y">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0756c7]">How it works</p>
            <h2 className="mt-4 text-3xl font-extrabold text-[#123c73] md:text-4xl">Four simple steps</h2>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-3xl border border-[#1268d8]/10 bg-[#f9fcff] p-6">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full text-sm font-extrabold text-white shadow-card ${
                    index % 2 === 0
                      ? "bg-[linear-gradient(135deg,_#0756c7_0%,_#3487ef_100%)]"
                      : "bg-[linear-gradient(135deg,_#ff651f_0%,_#f49a42_100%)]"
                  }`}
                >
                  {index + 1}
                </span>
                <h3 className="mt-5 text-base font-extrabold text-[#123c73]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5a7087]">{step.description}</p>
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
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(145deg,_#073b77_0%,_#164d91_48%,_#6f3c68_100%)] text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#ff651f]/25 blur-3xl" />
        <div className="container-page section-y relative">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffd4b5]">Why us</p>
            <h2 className="mt-4 text-3xl font-extrabold text-white md:text-4xl">
              Why choose Amazingfly Travels
            </h2>
          </div>
          <ul className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason, index) => (
              <li
                key={reason.text}
                className="flex gap-4 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                <reason.icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${index % 2 === 0 ? "text-[#ffd0ad]" : "text-[#9fd0ff]"}`}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium leading-relaxed text-white/90">{reason.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,_#f7fbff_0%,_#edf6ff_60%,_#fff7ef_100%)]">
        <div className="container-page section-y">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e95516]">Main service</p>
              <h2 className="mt-4 text-3xl font-extrabold text-[#123c73] md:text-4xl">Visa Assistance</h2>
              <p className="mt-5 text-base leading-relaxed text-[#536f8c]">{visa.introduction}</p>
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
            <div className="rounded-3xl border border-[#1268d8]/10 bg-white/95 p-8 shadow-[0_24px_58px_-40px_rgba(18,60,115,0.55)] backdrop-blur-sm">
              <ul className="space-y-4">
                {visaHighlights.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#5a7087]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#18a97d]" aria-hidden="true" />
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
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,_#e9fbf5_0%,_#eaf7ff_55%,_#f7f3ff_100%)]">
        <div className="container-page section-y">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold text-[#123c73] md:text-4xl">Other travel services</h2>
            <p className="mt-5 text-base leading-relaxed text-[#536f8c]">
              Alongside visa assistance, customers can also access the following support from
              Amazingfly Travels.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Flight reservations", to: "/flights" as const },
              { label: "Hotel reservations", to: "/hotels" as const },
            ].map((item, index) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/95 px-5 py-4 text-sm font-semibold text-[#123c73] shadow-[0_14px_30px_-26px_rgba(18,60,115,0.5)] transition hover:-translate-y-0.5 hover:border-[#1268d8]/30"
                >
                  <ArrowRight className={`h-4 w-4 shrink-0 ${index === 0 ? "text-[#0756c7]" : "text-[#e95516]"}`} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/request" search={{ service: "travel-insurance" }} className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/95 px-5 py-4 text-sm font-semibold text-[#123c73] shadow-[0_14px_30px_-26px_rgba(18,60,115,0.5)] transition hover:-translate-y-0.5 hover:border-[#18a97d]/30">
                <ArrowRight className="h-4 w-4 shrink-0 text-[#18a97d]" aria-hidden="true" />
                Travel insurance
              </Link>
            </li>
            <li>
              <Link to="/request" search={{ service: "police-character-certificate" }} className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/95 px-5 py-4 text-sm font-semibold text-[#123c73] shadow-[0_14px_30px_-26px_rgba(18,60,115,0.5)] transition hover:-translate-y-0.5 hover:border-[#6b4bd4]/30">
                <ArrowRight className="h-4 w-4 shrink-0 text-[#6b4bd4]" aria-hidden="true" />
                Police Character Certificates
              </Link>
            </li>
            <li>
              <Link to="/request" search={{ service: "yellow-fever-card" }} className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/95 px-5 py-4 text-sm font-semibold text-[#123c73] shadow-[0_14px_30px_-26px_rgba(18,60,115,0.5)] transition hover:-translate-y-0.5 hover:border-[#ff651f]/30">
                <ArrowRight className="h-4 w-4 shrink-0 text-[#ff651f]" aria-hidden="true" />
                Yellow Fever Cards
              </Link>
            </li>
            <li>
              <Link to="/request" search={{ service: "proof-of-funds" }} className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/95 px-5 py-4 text-sm font-semibold text-[#123c73] shadow-[0_14px_30px_-26px_rgba(18,60,115,0.5)] transition hover:-translate-y-0.5 hover:border-[#1268d8]/30">
                <ArrowRight className="h-4 w-4 shrink-0 text-[#0756c7]" aria-hidden="true" />
                Proof of Funds support
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section className="container-page section-y">
        <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,_#064ba9_0%,_#1d66ce_48%,_#ff651f_135%)] px-8 py-14 text-center shadow-[0_30px_70px_-35px_rgba(7,86,199,0.7)] md:px-16 md:py-20">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#ff8b4a]/30 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-white md:text-4xl">
              Start Your Travel Request Today
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/85">
              Choose the service you need and let the Amazingfly Travels team guide you through the next
              steps on Amazingfly.ng.
            </p>
            <Button asChild size="lg" className="mt-9 border-0 bg-white font-extrabold text-[#0756c7] shadow-lg hover:bg-[#fff4ec] hover:text-[#e95516]">
              <Link to="/services">Choose a Service</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
