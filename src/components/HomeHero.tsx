import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronsUpDown,
  Headphones,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import travellerImage from "@/assets/hero-traveller-cutout.png";
import { getHeroContent } from "@/lib/cms.functions";
import type { CustomerSuccess } from "@/lib/customer-successes";
import {
  ORIGIN_COUNTRY,
  WORLD_COUNTRIES,
  CAROUSEL_FLAGS,
  type WorldCountry,
} from "@/lib/geo/countries";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const TRUST_STATS = [
  { value: "99%", label: "Approval rate", icon: ShieldCheck },
  { value: "24/7", label: "Expert support", icon: Headphones },
  { value: "100%", label: "Secure & confidential", icon: Lock },
];

/** Bold gradient words that rotate under the headline. */
const ROTATING_WORDS = ["stress-free", "hassle-free", "with confidence"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#294f80]">
      {children}
    </span>
  );
}

export function HomeHero({ customerSuccesses = [] }: { customerSuccesses?: CustomerSuccess[] }) {
  const navigate = useNavigate();
  const fetchHero = useServerFn(getHeroContent);
  const heroQuery = useQuery({
    queryKey: ["hero-content"],
    queryFn: () => fetchHero(),
    staleTime: 30_000,
  });
  const cms = heroQuery.data ?? {};

  const badge = cms.badge ?? "Amazingfly.ng · Visas made simple";
  const backgroundImage = cms.backgroundImageUrl ?? "";
  const traveller = cms.travellerImageUrl || travellerImage;
  const rotating = cms.rotatingWords?.length ? cms.rotatingWords : ROTATING_WORDS;

  const [destination, setDestination] = useState<WorldCountry | null>(null);
  const [open, setOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % rotating.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [rotating.length]);

  const highlight = useMemo(
    () => rotating[wordIndex % rotating.length] ?? rotating[0]!,
    [rotating, wordIndex],
  );

  const flagCarousel = useMemo(() => [...CAROUSEL_FLAGS, ...CAROUSEL_FLAGS], []);

  const handleApply = () => {
    if (!destination) {
      setValidationMessage("Please choose the country you want to apply for a visa to.");
      return;
    }
    setValidationMessage(null);
    void navigate({
      to: "/request",
      search: {
        service: "visa-assistance",
        from: ORIGIN_COUNTRY.name,
        to: destination.name,
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
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="container-page relative pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1268d8]/20 bg-white/85 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#174b88] shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[#ff651f]" aria-hidden="true" />
            {badge}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#123c73] md:text-6xl">
            <span className="block">Get your visa,</span>
            <span
              key={highlight}
              className="hero-rotate mt-2 block bg-[linear-gradient(90deg,_#0756c7_0%,_#5c45cc_45%,_#ff651f_100%)] bg-clip-text text-transparent"
            >
              {highlight}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#365b86] md:text-lg">
            Apply for your visa to any destination with expert guidance from start to finish.
            Fast, secure and built for <span className="font-extrabold text-[#df5418]">Nigerian travellers.</span>
          </p>

          {/* Trust stats — iVisa style */}
          <div className="mx-auto mt-7 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {TRUST_STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2.5 rounded-2xl border border-white/90 bg-white/80 px-4 py-2.5 shadow-[0_10px_30px_-20px_rgba(11,87,208,0.45)] backdrop-blur"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,_#dbeafe_0%,_#bfdbfe_100%)]">
                  <stat.icon className="h-4.5 w-4.5 text-[#0756c7]" aria-hidden="true" />
                </span>
                <span className="text-left">
                  <span className="block text-lg font-extrabold leading-none text-[#123c73]">
                    {stat.value}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5c7087]">
                    {stat.label}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Search area — iVisa style: fixed Nigeria origin + searchable destination */}
        <div className="mx-auto mt-10 max-w-4xl rounded-[28px] border border-white/90 bg-white/90 p-4 shadow-[0_28px_70px_-35px_rgba(15,70,145,0.5)] backdrop-blur-xl md:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
            {/* From — fixed Nigeria */}
            <label className="block text-left">
              <FieldLabel>Applying from</FieldLabel>
              <div className="flex h-[52px] w-full items-center gap-2.5 rounded-2xl border border-[#1268d8]/20 bg-[#f6f9ff] px-4 text-sm font-bold text-navy">
                <span className="text-xl leading-none" aria-hidden="true">
                  {ORIGIN_COUNTRY.flag}
                </span>
                <span>{ORIGIN_COUNTRY.name}</span>
                <Lock
                  className="ml-auto h-3.5 w-3.5 text-[#9db2ce]"
                  aria-label="Origin fixed to Nigeria"
                />
              </div>
            </label>

            {/* Destination — searchable */}
            <label className="block text-left">
              <FieldLabel>Where do you want to go?</FieldLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    className="flex h-[52px] w-full items-center gap-2.5 rounded-2xl border border-[#1268d8]/20 bg-white px-4 text-sm font-semibold text-navy shadow-[0_10px_30px_-20px_rgba(11,87,208,0.45)] outline-none transition duration-300 hover:border-[#1268d8]/45 focus:border-[#1268d8]/70 focus:ring-4 focus:ring-[#1268d8]/15"
                  >
                    {destination ? (
                      <>
                        <span className="text-xl leading-none" aria-hidden="true">
                          {destination.flag}
                        </span>
                        <span className="truncate">{destination.name}</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 shrink-0 text-[#1268d8]" aria-hidden="true" />
                        <span className="text-[#8296b0]">Search a destination country…</span>
                      </>
                    )}
                    <ChevronsUpDown
                      className="ml-auto h-4 w-4 shrink-0 text-[#9db2ce]"
                      aria-hidden="true"
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                  <Command>
                    <CommandInput placeholder="Type a country name…" />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {WORLD_COUNTRIES.map((country) => (
                          <CommandItem
                            key={country.alpha + country.name}
                            value={country.name}
                            onSelect={() => {
                              setDestination(country);
                              setOpen(false);
                              setValidationMessage(null);
                            }}
                          >
                            <span className="mr-2 text-lg leading-none" aria-hidden="true">
                              {country.flag}
                            </span>
                            <span className="truncate">{country.name}</span>
                            {destination?.name === country.name ? (
                              <Check className="ml-auto h-4 w-4 text-[#0756c7]" aria-hidden="true" />
                            ) : null}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </label>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,_#0756c7_0%,_#1b70e7_50%,_#ff651f_100%)] px-7 text-sm font-extrabold text-white shadow-[0_14px_32px_-14px_rgba(11,87,208,0.8)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-14px_rgba(255,101,31,0.65)]"
            >
              Apply for Visa
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {validationMessage ? (
            <p
              role="status"
              className="fade-slide-in mt-3 flex items-center gap-2 rounded-2xl border border-coral/30 bg-coral-tint px-4 py-2.5 text-sm font-medium text-navy"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
              {validationMessage}
            </p>
          ) : (
            <p className="mt-3 text-center text-xs font-medium text-[#55708d]">
              Choose your destination and we'll guide you through every step of the application.
            </p>
          )}
        </div>

        {/* Auto-moving flag carousel flowing behind the traveller image */}
        <div className="mx-auto mt-10 max-w-5xl">
          <p className="text-center text-sm font-extrabold uppercase tracking-[0.16em] text-[#294f80]">
            Apply for visa to your desired destinations
          </p>

          <div className="relative mt-6 min-h-[300px] md:min-h-[420px]">
            {/* Flags — layered behind, vertically centred */}
            <div className="hero-flag-fade absolute inset-0 z-0 flex items-center overflow-hidden">
              <div className="customer-success-track flex w-max items-stretch gap-3">
                {flagCarousel.map((country, i) => (
                  <div
                    key={`${country.alpha}-${i}`}
                    aria-hidden={i >= CAROUSEL_FLAGS.length || undefined}
                    className="flex w-36 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-[#1268d8]/10 bg-white/85 px-3 py-3 shadow-sm backdrop-blur"
                  >
                    <span className="text-3xl leading-none" aria-hidden="true">
                      {country.flag}
                    </span>
                    <span className="text-center text-xs font-bold text-[#123c73]">
                      {country.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Traveller image — on top of the flags, back on the right */}
            <div className="pointer-events-none relative z-10 flex justify-center md:justify-end">
              <img
                src={traveller}
                alt="Nigerian traveller holding a passport and boarding pass with luggage"
                width={1024}
                height={1280}
                className="h-[300px] w-auto object-contain drop-shadow-[0_30px_45px_rgba(27,87,165,0.24)] md:h-[420px] md:mr-10"
              />
            </div>
          </div>
        </div>

        {customerSuccesses.length ? (
          <div className="relative mx-auto mt-10 max-w-5xl overflow-hidden rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-[0_24px_65px_-36px_rgba(16,65,130,0.55)] backdrop-blur-xl">
            <div className="overflow-hidden" aria-label="Recent customer successes">
              <div className="customer-success-track flex w-max gap-4">
                {[...customerSuccesses, ...customerSuccesses].map((item, itemIndex) => (
                  <article
                    key={`${item.id}-${itemIndex}`}
                    aria-hidden={itemIndex >= customerSuccesses.length || undefined}
                    className="flex w-72 shrink-0 items-center gap-3 rounded-2xl border border-[#1268d8]/10 bg-[#f9fcff] p-3 shadow-sm"
                  >
                    <img
                      src={item.image_url}
                      alt={itemIndex >= customerSuccesses.length ? "" : item.title}
                      className="h-20 w-24 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#e95516]">
                        Customer success
                      </p>
                      <h2 className="mt-1 line-clamp-2 text-sm font-extrabold text-[#123c73]">
                        {item.title}
                      </h2>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-[#5c7087]">{item.description}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
