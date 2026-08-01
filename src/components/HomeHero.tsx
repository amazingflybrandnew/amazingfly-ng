import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Briefcase, Headphones, MapPin, ShieldCheck, Star, Zap } from "lucide-react";

import travellerImage from "@/assets/hero-traveller-cutout.png";

const ROTATING_HEADLINES = [
  "get your travel visa",
  "book your next flight",
  "plan your perfect trip",
  "secure your travel documents",
];

const ORIGINS = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
  "Canada",
  "United Arab Emirates",
];

const DESTINATIONS = [
  "United Kingdom",
  "USA",
  "Canada",
  "Schengen Countries",
  "Dubai",
  "Australia",
  "Other destinations",
];

const NEEDS = [
  { label: "Visa Application", slug: "visa-assistance" },
  { label: "Flight Booking", slug: "flights" },
  { label: "Hotel Booking", slug: "hotels" },
  { label: "Travel Documents", slug: "proof-of-funds" },
];

const FEATURES = [
  { icon: Zap, title: "Fast Processing", description: "Quick support for urgent travellers" },
  { icon: ShieldCheck, title: "Secure & Protected", description: "Your documents are handled safely" },
  { icon: Headphones, title: "Expert Guidance", description: "Real travel specialists helping you" },
  { icon: Star, title: "High Success Rate", description: "Professional visa preparation support" },
];

const selectClass =
  "w-full appearance-none rounded-2xl border border-white/70 bg-white/85 px-4 py-3 pr-10 text-sm font-semibold text-navy shadow-[0_1px_2px_rgba(60,60,110,0.05)] outline-none transition duration-300 hover:border-sky/50 focus:border-sky/70 focus:ring-4 focus:ring-sky/20";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </span>
  );
}

export function HomeHero() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [need, setNeed] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ROTATING_HEADLINES.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, []);

  const highlight = useMemo(() => ROTATING_HEADLINES[index]!, [index]);
  const isComplete = Boolean(origin && destination && need);

  useEffect(() => {
    if (isComplete) setValidationMessage(null);
  }, [isComplete]);

  const missingMessage = () => {
    if (!origin) return "Please select the country you are travelling from before continuing.";
    if (!destination) return "Please select your destination before continuing.";
    return "Please select the service you need before continuing.";
  };

  const handleStart = () => {
    if (!isComplete) {
      setValidationMessage(missingMessage());
      return;
    }
    const selected = NEEDS.find((item) => item.label === need);
    navigate({
      to: "/request",
      search: {
        ...(selected ? { service: selected.slug } : {}),
        from: origin,
        to: destination,
      },
    });
  };

  return (
    <section className="relative isolate overflow-hidden hero-aurora">
      {/* Atmosphere: soft clouds, flight routes, skyline silhouettes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />
        <div className="hero-glow hero-glow-c" />
        <svg
          className="absolute inset-0 h-full w-full opacity-70"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <path
            d="M-40 250 C 300 90, 700 380, 1040 180 S 1420 120, 1500 210"
            stroke="currentColor"
            className="text-white/80"
            strokeWidth="2"
            strokeDasharray="10 16"
          />
          <path
            d="M-40 470 C 320 620, 760 300, 1120 470 S 1440 560, 1520 500"
            stroke="currentColor"
            className="text-white/50"
            strokeWidth="2"
            strokeDasharray="10 18"
          />
          <path
            d="M0 780 L60 720 L110 780 L170 690 L220 780 L275 640 L330 780 L390 700 L450 780 L520 660 L580 780 L650 720 L710 780 L780 640 L840 780 L910 700 L980 780 L1050 660 L1110 780 L1180 715 L1250 780 L1320 690 L1380 780 L1440 730 L1440 900 L0 900 Z"
            className="fill-white/25"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="container-page relative pb-20 pt-14 md:pb-28 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-navy/70 backdrop-blur">
            Amazingfly.ng · Travel made simple
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
            <span className="block">Your fastest way to</span>
            <span key={highlight} className="hero-rotate mt-2 block text-gradient-brand">
              {highlight}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-navy/70 md:text-lg">
            <span className="font-semibold text-navy">Fast</span>,{" "}
            <span className="font-semibold text-navy">reliable</span> and stress-free travel solutions
            for <span className="font-bold text-gradient-brand">every destination.</span>
          </p>
        </div>

        {/* Interactive search — all three fields required */}
        <div className="mx-auto mt-10 max-w-5xl rounded-[28px] glass-card p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <label className="block text-left">
              <FieldLabel>I&apos;m travelling from</FieldLabel>
              <div className="relative">
                <select
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value)}
                  className={selectClass}
                  aria-label="I'm travelling from"
                >
                  <option value="">Select passport country</option>
                  {ORIGINS.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <MapPin
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky"
                  aria-hidden="true"
                />
              </div>
            </label>

            <label className="block text-left">
              <FieldLabel>I want to go to</FieldLabel>
              <div className="relative">
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className={selectClass}
                  aria-label="I want to go to"
                >
                  <option value="">Select destination</option>
                  {DESTINATIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <MapPin
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lavender"
                  aria-hidden="true"
                />
              </div>
            </label>

            <label className="block text-left">
              <FieldLabel>I need a</FieldLabel>
              <div className="relative">
                <select
                  value={need}
                  onChange={(event) => setNeed(event.target.value)}
                  className={selectClass}
                  aria-label="I need a"
                >
                  <option value="">Select service</option>
                  {NEEDS.map((item) => (
                    <option key={item.slug} value={item.label}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <Briefcase
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange"
                  aria-hidden="true"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={handleStart}
              disabled={!isComplete}
              aria-disabled={!isComplete}
              className="btn-gradient inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl px-7 text-sm font-bold text-white shadow-card hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {!isComplete ? (
            <button
              type="button"
              onClick={() => setValidationMessage(missingMessage())}
              className="mt-3 block w-full cursor-default text-left text-xs font-medium text-muted-foreground md:hidden"
            >
              Select all three options to continue.
            </button>
          ) : null}

          {validationMessage ? (
            <p
              role="status"
              className="fade-slide-in mt-3 flex items-center gap-2 rounded-2xl border border-coral/30 bg-coral-tint px-4 py-2.5 text-sm font-medium text-navy"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
              {validationMessage}
            </p>
          ) : null}
        </div>

        {/* Trust */}
        <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["A", "F", "T", "N"].map((initial, position) => (
                <span
                  key={initial}
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white ${
                    position % 2 === 0 ? "bg-navy-soft" : "bg-orange"
                  }`}
                  aria-hidden="true"
                >
                  {initial}
                </span>
              ))}
            </div>
            <span className="font-semibold text-navy">Trusted by thousands of travellers</span>
          </div>
          <span className="hidden h-5 w-px bg-navy/15 sm:block" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} className="h-4 w-4 fill-orange text-orange" />
              ))}
            </span>
            <span className="font-semibold text-navy">4.8/5 on Trustpilot</span>
          </div>
        </div>

        {/* Traveller + feature cards */}
        <div className="relative mt-10 md:mt-4">
          <div className="pointer-events-none flex justify-center md:justify-end">
            <img
              src={travellerImage}
              alt="Nigerian traveller holding a passport and boarding pass with luggage"
              width={1024}
              height={1280}
              className="h-[300px] w-auto object-contain drop-shadow-[0_30px_45px_rgba(80,80,140,0.16)] md:h-[420px] md:-mt-10 md:mr-10"
            />
          </div>

          <div className="relative -mt-10 rounded-[28px] glass-card p-6 md:-mt-24 md:p-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-navy/10">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex gap-3 lg:px-5 lg:first:pl-0 lg:last:pr-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-tint to-peach-tint">
                    <feature.icon className="h-5 w-5 text-orange" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-navy">{feature.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
