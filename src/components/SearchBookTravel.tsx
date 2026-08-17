import { useState } from "react";
import { Award, Building2, Headphones, Plane, PlaneTakeoff, ShieldCheck, Sparkles } from "lucide-react";
import { FlightSearch } from "@/components/FlightSearch";
import { HotelSearch } from "@/components/HotelSearch";

type Mode = "flights" | "hotels";

// Lovable's /__l5e/assets-v1/... URLs are served by Lovable's asset proxy and
// are not available on the Vercel deployment. Use normal HTTPS image assets so
// the same component renders correctly on every deployment target.
const FLIGHT_BACKGROUND =
  "https://images.pexels.com/photos/11255361/pexels-photo-11255361.jpeg?cs=srgb&fm=jpg";
const HOTEL_BACKGROUND =
  "https://images.pexels.com/photos/16099258/pexels-photo-16099258.jpeg?cs=srgb&fm=jpg";

const trustIndicators = [
  { icon: ShieldCheck, title: "Secure Booking", subtitle: "100% secure payments" },
  { icon: Headphones, title: "24/7 Support", subtitle: "We're here for you" },
  { icon: Award, title: "Best Price Guarantee", subtitle: "Always the best deals" },
];

export function SearchBookTravel() {
  const [mode, setMode] = useState<Mode>("flights");
  const isFlights = mode === "flights";

  return (
    <section className="relative isolate overflow-hidden bg-[#0b1f3a]">
      <div className="absolute inset-0 -z-10">
        <img
          src={FLIGHT_BACKGROUND}
          alt="Aircraft parked at an airport gate at sunset"
          loading="eager"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-out ${
            isFlights ? "opacity-100" : "opacity-0"
          }`}
        />
        <img
          src={HOTEL_BACKGROUND}
          alt="Warmly lit hotel exterior in the evening"
          loading="eager"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-out ${
            isFlights ? "opacity-0" : "opacity-100"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/15 to-white/75" />
      </div>

      <div className="container-page relative pb-14 pt-12 md:pt-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-[#6b4bd4] shadow-[0_10px_24px_-18px_rgba(11,31,58,0.8)] backdrop-blur">
              <Plane className="h-4 w-4 text-[#0756c7]" aria-hidden="true" />
              Your journey starts here
            </span>
            <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-[#123c73] md:text-6xl">
              Search. Book. Travel.
            </h2>
            <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-[#33507a]">
              {isFlights
                ? "Find the best flights at great prices and enjoy a seamless booking experience with Amazingfly."
                : "Find the best hotels at great prices and enjoy a seamless booking experience with Amazingfly."}
            </p>
          </div>

          <ul className="flex flex-wrap gap-6 lg:justify-end">
            {trustIndicators.map((item) => (
              <li key={item.title} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/90 shadow-[0_10px_24px_-18px_rgba(11,31,58,0.9)] backdrop-blur">
                  <item.icon className="h-5 w-5 text-[#0756c7]" aria-hidden="true" />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-extrabold text-[#123c73]">{item.title}</span>
                  <span className="block text-xs font-medium text-[#41608c]">{item.subtitle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 md:mt-20">
          <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-white/70 bg-white/45 p-1.5 shadow-[0_18px_44px_-30px_rgba(11,31,58,0.9)] backdrop-blur-md">
            <button
              type="button"
              aria-pressed={isFlights}
              onClick={() => setMode("flights")}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition ${
                isFlights
                  ? "border border-[#0756c7]/40 bg-white text-[#0756c7] shadow-sm"
                  : "border border-transparent text-[#41608c] hover:text-[#123c73]"
              }`}
            >
              <PlaneTakeoff className="h-4 w-4" aria-hidden="true" />
              Flight Search
            </button>
            <button
              type="button"
              aria-pressed={!isFlights}
              onClick={() => setMode("hotels")}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition ${
                !isFlights
                  ? "border border-[#e95516]/40 bg-white text-[#e95516] shadow-sm"
                  : "border border-transparent text-[#41608c] hover:text-[#123c73]"
              }`}
            >
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Hotel Booking
            </button>
          </div>

          <div className="mt-4 rounded-[2rem] border border-white/80 bg-white/95 p-3 shadow-[0_30px_70px_-40px_rgba(11,31,58,0.85)] backdrop-blur-lg md:p-6">
            {isFlights ? <FlightSearch compact /> : <HotelSearch compact />}
            <p className="mt-4 px-2 text-xs font-medium text-[#5b7189]">
              {isFlights
                ? "Search live routes, fares and cabins. You'll continue to the dedicated payment flow."
                : "Search live availability, best rates, and exclusive hotel deals."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMode(isFlights ? "hotels" : "flights")}
            className="mx-auto mt-6 flex items-center gap-2 rounded-full bg-white/85 px-5 py-2.5 text-sm text-[#41608c] shadow-[0_12px_30px_-24px_rgba(11,31,58,0.9)] backdrop-blur transition hover:bg-white"
          >
            <Sparkles className="h-4 w-4 text-[#6b4bd4]" aria-hidden="true" />
            <span className="font-bold text-[#6b4bd4]">
              {isFlights ? "You're searching flights" : "You're searching hotels"}
            </span>
            <span>
              {isFlights ? (
                <>
                  Switch to <strong className="font-bold text-[#123c73]">Hotel Booking</strong> to find the
                  perfect stay.
                </>
              ) : (
                <>
                  Switch to <strong className="font-bold text-[#123c73]">Flight Search</strong> to find the
                  best flight deals.
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
