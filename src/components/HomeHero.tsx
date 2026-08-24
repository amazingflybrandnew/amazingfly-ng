import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ArrowRight, Briefcase, Headphones, MapPin, ShieldCheck, Star, Zap } from "lucide-react";

import travellerImage from "@/assets/hero-traveller-cutout.png";
import { getHeroContent } from "@/lib/cms.functions";

const ROTATING_HEADLINES = [
  "prepare your visa application",
  "book your next flight",
  "plan your perfect trip",
  "request travel document support",
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
  { label: "Visa Hotel Reservation", slug: "visa-hotel-reservation" },
  { label: "Travel Documents", slug: "proof-of-funds" },
];

const FEATURES = [
  { icon: Zap, title: "Responsive Support", description: "Help for time-sensitive travel plans" },
  { icon: ShieldCheck, title: "Secure & Protected", description: "Your documents are handled safely" },
  { icon: Headphones, title: "Expert Guidance", description: "Real travel specialists helping you" },
  { icon: Star, title: "Trusted Service", description: "Professional visa preparation support" },
];

const selectClass =
  "w-full appearance-none rounded-2xl border border-[#1268d8]/20 bg-white/95 px-4 py-3 pr-10 text-sm font-semibold text-navy shadow-[0_10px_30px_-20px_rgba(11,87,208,0.45)] outline-none transition duration-300 hover:border-[#1268d8]/45 focus:border-[#1268d8]/70 focus:ring-4 focus:ring-[#1268d8]/15";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#294f80]">
      {children}
    </span>
  );
}

export function HomeHero() {
  const navigate = useNavigate();
  const fetchHero = useServerFn(getHeroContent);
  const heroQuery = useQuery({
    queryKey: ["hero-content"],
    queryFn: () => fetchHero(),
    staleTime: 30_000,
  });
  const cms = heroQuery.data ?? {};

  const badge = cms.badge ?? "Amazingfly.ng · Travel made simple";
  const headline = cms.headline ?? "A simpler way to";
  const description = cms.description ?? "";
  const ctaLabel = cms.ctaLabel ?? "Get Started";
  const backgroundImage = cms.backgroundImageUrl ?? "";
  const traveller = cms.travellerImageUrl || travellerImage;
  const rotating = cms.rotatingWords?.length ? cms.rotatingWords : ROTATING_HEADLINES;

  const [index, setIndex] = useState(0);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [need, setNeed] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % rotating.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [rotating.length]);

  const highlight = useMemo(
    () => rotating[index % rotating.length] ?? rotating[0]!,
    [rotating, index],
  );
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
    if (selected?.slug === "flights") {
      void navigate({ to: "/flights" });
      return;
    }
    if (selected?.slug === "hotels") {
      void navigate({ to: "/hotels" });
      return;
    }
    if (selected?.slug === "visa-hotel-reservation") {
      void navigate({
        to: "/visa-hotel-reservation",
        search: { from: origin, to: destination },
      });
      return;
    }

    void navigate({
      to: "/request",
      search: {
        ...(selected ? { service: selected.slug } : {}),
        from: origin,
        to: destination,
      },
    });
  };

  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,_#e7f1ff_0%,_#f2edff_38%,_#fff0e4_72%,_#e6fbf5_100%)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {backgroundImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        ) : null}
        <div className="absolute -left-32 top-4 h-[30rem] w-[30rem] rounded-full bg-[#1268d8]/25 blur-[115px]" />
        <div className="absolute -right-36 top-28 h-[32rem] w-[32rem] rounded-full bg-[#ff6b21]/25 blur-[120px]" />
        <div className="absolute bottom-[-12rem] left-[28%] h-[30rem] w-[30rem] rounded-full bg-[#22b98b]/20 blur-[120px]" />
        <svg
          className="absolute inset-0 h-full w-full opacity-75"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <path
            d="M-40 250 C 300 90, 700 380, 1040 180 S 1420 120, 1500 210"
            stroke="currentColor"
            className="text-white/90"
            strokeWidth="2"
            strokeDasharray="10 16"
          />
          <path
            d="M-40 470 C 320 620, 760 300, 1120 470 S 1440 560, 1520 500"
            stroke="currentColor"
            className="text-white/65"
            strokeWidth="2"
            strokeDasharray="10 18"
          />
          <path
            d="M0 780 L60 720 L110 780 L170 690 L220 780 L275 640 L330 780 L390 700 L450 780 L520 660 L580 780 L650 720 L710 780 L780 640 L840 780 L910 700 L980 780 L1050 660 L1110 780 L1180 715 L1250 780 L1320 690 L1380 780 L1440 730 L1440 900 L0 900 Z"
            className="fill-white/35"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="container-page relative pb-20 pt-14 md:pb-28 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1268d8]/20 bg-white/85 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#174b88] shadow-sm backdrop-blur">
            {badge}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#123c73] md:text-6xl">
            <span className="block">{headline}</span>
            <span
              key={highlight}
              className="hero-rotate mt-2 block bg-[linear-gradient(90deg,_#0756c7_0%,_#5c45cc_45%,_#ff651f_100%)] bg-clip-text text-transparent"
            >
              {highlight}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#365b86] md:text-lg">
            {description ? (
              description
            ) : (
              <>
                Practical travel planning and human support for{" "}
                <span className="font-extrabold text-[#df5418]">Nigerian travellers.</span>
              </>
            )}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl rounded-[28px] border border-white/90 bg-white/88 p-4 shadow-[0_28px_70px_-35px_rgba(15,70,145,0.5)] backdrop-blur-xl md:p-5">
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
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1268d8]"
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
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b4bd4]"
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
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ff651f]"
                  aria-hidden="true"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={handleStart}
              aria-disabled={!isComplete}
              className={`inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,_#0756c7_0%,_#1b70e7_50%,_#ff651f_100%)] px-7 text-sm font-extrabold text-white shadow-[0_14px_32px_-14px_rgba(11,87,208,0.8)] transition duration-300 ${
                isComplete
                  ? "hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-14px_rgba(255,101,31,0.65)]"
                  : "cursor-not-allowed opacity-45 saturate-50"
              }`}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {!isComplete && !validationMessage ? (
            <p className="mt-3 text-center text-xs font-medium text-[#55708d] md:text-left">
              Select all three options to continue.
            </p>
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

        <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["A", "F", "T", "N"].map((initial, position) => (
                <span
                  key={initial}
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-sm ${
                    position % 2 === 0 ? "bg-[#0756c7]" : "bg-[#ff651f]"
                  }`}
                  aria-hidden="true"
                >
                  {initial}
                </span>
              ))}
            </div>
            <span className="font-bold text-[#123c73]">Travel support for Nigerian travellers</span>
          </div>
          <span className="hidden h-5 w-px bg-[#123c73]/20 sm:block" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-[#ff651f]" aria-hidden="true" />
            <span className="font-bold text-[#123c73]">Human support throughout your request</span>
          </div>
        </div>

        <div className="relative mt-10 md:mt-4">
          <div className="pointer-events-none flex justify-center md:justify-end">
            <img
              src={traveller}
              alt="Nigerian traveller holding a passport and boarding pass with luggage"
              width={1024}
              height={1280}
              className="h-[300px] w-auto object-contain drop-shadow-[0_30px_45px_rgba(27,87,165,0.24)] md:h-[420px] md:-mt-10 md:mr-10"
            />
          </div>

          <div className="relative -mt-10 rounded-[28px] border border-white/90 bg-white/90 p-6 shadow-[0_24px_65px_-36px_rgba(16,65,130,0.55)] backdrop-blur-xl md:-mt-24 md:p-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[#1268d8]/15">
              {FEATURES.map((feature, featureIndex) => (
                <div key={feature.title} className="flex gap-3 lg:px-5 lg:first:pl-0 lg:last:pr-0">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      featureIndex % 2 === 0
                        ? "bg-[linear-gradient(135deg,_#dbeafe_0%,_#bfdbfe_100%)]"
                        : "bg-[linear-gradient(135deg,_#ffedd5_0%,_#fed7aa_100%)]"
                    }`}
                  >
                    <feature.icon
                      className={`h-5 w-5 ${featureIndex % 2 === 0 ? "text-[#0756c7]" : "text-[#e95516]"}`}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-[#123c73]">{feature.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#5c7087]">
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
