import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Briefcase, Headphones, MapPin, ShieldCheck, Star, Zap } from "lucide-react";

import travellerImage from "@/assets/hero-traveller-photo.png";

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
  {
    icon: Zap,
    title: "Super Fast",
    description: "Quick processing for urgent travellers",
    tint: "bg-lavender-tint",
    tone: "text-lavender",
  },
  {
    icon: ShieldCheck,
    title: "100% Secure",
    description: "Your data and documents stay safe with us",
    tint: "bg-mint-tint",
    tone: "text-mint",
  },
  {
    icon: Headphones,
    title: "Expert Support",
    description: "Real people, real travel specialists",
    tint: "bg-sky-tint",
    tone: "text-sky",
  },
  {
    icon: Star,
    title: "High Success",
    description: "Careful, professional application preparation",
    tint: "bg-peach-tint",
    tone: "text-orange",
  },
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

/** Low-opacity landmark & travel illustrations blended into the gradient. */
function LandmarkBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <g className="text-lavender" opacity="0.22" fill="currentColor">
        {/* Palm tree, far left */}
        <path d="M96 760 C 92 660, 100 590, 118 520 L132 522 C 116 592, 110 662, 114 760 Z" />
        <path d="M124 516 C 78 470, 34 462, 4 486 C 46 470, 92 486, 122 524 Z" />
        <path d="M124 512 C 96 452, 44 424, 2 430 C 52 438, 96 470, 120 518 Z" />
        <path d="M126 512 C 140 452, 186 414, 236 412 C 188 428, 148 466, 132 518 Z" />
        <path d="M128 516 C 168 480, 226 470, 264 490 C 216 484, 168 494, 134 524 Z" />
        {/* Statue of Liberty */}
        <path d="M112 800 L106 690 L118 690 Z" opacity="0.7" />
        {/* Big Ben, right */}
        <path d="M1318 800 L1318 470 L1352 440 L1386 470 L1386 800 Z" />
        <path d="M1352 424 L1358 400 L1352 372 L1346 400 Z" />
        <circle cx="1352" cy="512" r="20" className="fill-white/60" />
        {/* Ferris wheel */}
        <circle cx="1216" cy="600" r="62" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="1216" cy="600" r="10" />
        <path d="M1216 538 L1216 662 M1154 600 L1278 600 M1172 556 L1260 644 M1260 556 L1172 644"
          stroke="currentColor" strokeWidth="2" />
        {/* Skyline silhouette */}
        <path d="M0 800 L70 740 L120 800 L190 700 L250 800 L320 660 L380 800 L450 720 L520 800 L600 680 L660 800 L740 730 L810 800 L890 670 L950 800 L1030 720 L1100 800 L1180 690 L1260 800 L1340 730 L1440 800 L1440 900 L0 900 Z"
          opacity="0.5" />
      </g>

      {/* Hot air balloon */}
      <g className="text-coral" opacity="0.28">
        <path d="M1256 214 C 1256 168, 1290 136, 1326 136 C 1362 136, 1396 168, 1396 214 C 1396 254, 1362 286, 1326 306 C 1290 286, 1256 254, 1256 214 Z" fill="currentColor" />
        <path d="M1314 312 h24 v22 h-24 z" fill="currentColor" />
      </g>

      {/* Airplane + dotted flight trail */}
      <g className="text-sky" opacity="0.5">
        <path
          d="M1180 150 C 1080 250, 940 210, 860 300 C 790 380, 700 380, 620 330"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="4 14"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M1196 130 l52 14 l26 -20 l16 6 l-14 24 l40 12 l18 -14 l14 6 l-22 26 l-24 30 l-10 -12 l6 -30 l-40 -12 l-18 22 l-16 -6 l8 -32 Z"
          fill="currentColor"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}

export function HomeHero() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("Nigeria");
  const [destination, setDestination] = useState("");
  const [need, setNeed] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />
        <div className="hero-glow hero-glow-c" />
        <LandmarkBackdrop />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="container-page relative pb-20 pt-14 md:pb-28 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-[2.75rem] font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            <span className="block">Your journey,</span>
            <span className="mt-1 block">
              our <span className="text-gradient-brand">expertise.</span>
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
                  className={`${selectClass} pl-10`}
                  aria-label="I'm travelling from"
                >
                  <option value="">Select passport country</option>
                  {ORIGINS.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute left-3 top-1/2 flex h-4 w-6 -translate-y-1/2 overflow-hidden rounded-[3px] ring-1 ring-navy/10"
                  aria-hidden="true"
                >
                  <span className="h-full w-1/3 bg-mint" />
                  <span className="h-full w-1/3 bg-white" />
                  <span className="h-full w-1/3 bg-mint" />
                </span>
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
              aria-disabled={!isComplete}
              className={`btn-gradient inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl px-7 text-sm font-bold text-white shadow-card ${
                isComplete ? "hover:-translate-y-0.5" : "cursor-not-allowed opacity-45 saturate-50"
              }`}
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {!isComplete && !validationMessage ? (
            <p className="mt-3 text-center text-xs font-medium text-muted-foreground md:text-left">
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

        {/* Trust bar — style only, no fabricated figures */}
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
            <span className="font-semibold text-navy">Trusted by travellers across Nigeria</span>
          </div>
          <span className="hidden h-5 w-px bg-navy/15 sm:block" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} className="h-4 w-4 fill-mint text-mint" />
              ))}
            </span>
            <span className="font-semibold text-navy">Rated by real customers</span>
          </div>
        </div>

        {/* Traveller photo + feature cards */}
        <div className="relative mt-10 md:mt-4">
          <div className="pointer-events-none flex justify-center md:justify-end">
            <img
              src={travellerImage}
              alt="Nigerian traveller holding a passport and boarding pass with luggage"
              width={1024}
              height={1280}
              className="h-[300px] w-auto object-contain drop-shadow-[0_30px_45px_rgba(80,80,140,0.16)] md:h-[420px] md:-mt-10 md:mr-6"
            />
          </div>

          <div className="relative -mt-10 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-glass backdrop-blur-xl md:-mt-24 md:p-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-navy/10">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex gap-3 lg:px-5 lg:first:pl-0 lg:last:pr-0">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${feature.tint}`}>
                    <feature.icon className={`h-5 w-5 ${feature.tone}`} aria-hidden="true" />
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
