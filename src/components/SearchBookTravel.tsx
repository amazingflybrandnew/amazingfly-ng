import { useState } from "react";
import { Award, Headphones, Plane, ShieldCheck } from "lucide-react";
import { FlightSearch } from "@/components/FlightSearch";
import { HotelSearch } from "@/components/HotelSearch";
import { TravelInsuranceSearch } from "@/components/TravelInsuranceSearch";
import { FLIGHT_BACKGROUND, HOTEL_BACKGROUND } from "@/lib/home-search-backgrounds";

type Mode = "flights" | "hotels" | "insurance";

const trustIndicators = [
  { icon: ShieldCheck, title: "Secure Payments", subtitle: "Processed by trusted providers" },
  { icon: Headphones, title: "24/7 Support", subtitle: "We're here for you" },
  { icon: Award, title: "Live Supplier Options", subtitle: "Review rates before booking" },
];

export function SearchBookTravel() {
  const [mode, setMode] = useState<Mode>("flights");
  const isFlights = mode === "flights";
  const isInsurance = mode === "insurance";

  return (
    <section className="relative isolate overflow-hidden bg-[#0b1f3a]">
      <div className="absolute inset-0 -z-10">
        <img src={FLIGHT_BACKGROUND} alt="Aircraft parked at an airport gate at sunset" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${isFlights ? "opacity-100" : "opacity-0"}`} />
        <img src={HOTEL_BACKGROUND} alt="Warmly lit hotel exterior" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${isFlights ? "opacity-0" : "opacity-100"}`} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/15 to-white/75" />
      </div>
      <div className="container-page relative pb-14 pt-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-[#6b4bd4]"><Plane className="h-4 w-4" /> Your journey starts here</span>
            <h2 className="mt-6 text-4xl font-extrabold text-[#123c73] md:text-6xl">Search. Book. Travel.</h2>
          </div>
          <ul className="flex flex-wrap gap-6">{trustIndicators.map((item)=><li key={item.title} className="flex items-center gap-3"><item.icon className="h-5 w-5 text-[#0756c7]" /><span><b className="block text-[#123c73]">{item.title}</b><small>{item.subtitle}</small></span></li>)}</ul>
        </div>
        <div className="mt-12 md:mt-20">
          <div className="mx-auto flex w-fit flex-wrap items-center gap-1 rounded-full border bg-white/45 p-1.5">
            <button type="button" onClick={()=>setMode("flights")} className="rounded-full px-6 py-3 text-sm font-bold">Flight Search</button>
            <button type="button" onClick={()=>setMode("hotels")} className="rounded-full px-6 py-3 text-sm font-bold">Hotel Booking</button>
            <button type="button" onClick={()=>setMode("insurance")} className="rounded-full px-6 py-3 text-sm font-bold">Travel Insurance</button>
          </div>
          <div className="mt-4 rounded-[2rem] border bg-white/95 p-3 shadow-xl md:p-6">
            {isFlights ? <FlightSearch compact /> : isInsurance ? <TravelInsuranceSearch /> : <HotelSearch compact />}
          </div>
        </div>
      </div>
    </section>
  );
}
