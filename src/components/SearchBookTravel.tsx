import { useState } from "react";
import { Plane, Hotel, ShieldCheck } from "lucide-react";
import { FlightSearch } from "@/components/FlightSearch";
import { HotelSearch } from "@/components/HotelSearch";
import { TravelInsuranceSearch } from "@/components/TravelInsuranceSearch";
import { FLIGHT_BACKGROUND, HOTEL_BACKGROUND } from "@/lib/home-search-backgrounds";

export function SearchBookTravel() {
  const [service, setService] = useState("flight");

  const background = service === "hotel" ? HOTEL_BACKGROUND : FLIGHT_BACKGROUND;

  return (
    <section className="relative min-h-[760px] overflow-hidden">
      <img src={background} className="absolute inset-0 h-full w-full object-cover" alt="Travel" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#ffffff55] via-[#ffffff80] to-[#ffffffcc]" />

      <div className="relative container-page pt-16">
        <h1 className="max-w-xl text-6xl font-black leading-none text-[#123c73]">Search.<br/>Book.<br/>Travel.</h1>

        <div className="mx-auto mt-20 max-w-3xl rounded-3xl bg-white/75 p-2 shadow-lg backdrop-blur md:rounded-full">
          <div className="flex flex-col justify-around gap-1 sm:flex-row" role="tablist" aria-label="Travel search type">
            <button type="button" role="tab" aria-selected={service === "flight"} onClick={() => setService("flight")} className={`rounded-full px-6 py-3 font-bold transition ${service === "flight" ? "bg-[#253b75] text-white shadow" : "text-[#123c73] hover:bg-white/70"}`}><Plane className="mr-2 inline h-5 w-5"/>Flight Search</button>
            <button type="button" role="tab" aria-selected={service === "hotel"} onClick={() => setService("hotel")} className={`rounded-full px-6 py-3 font-bold transition ${service === "hotel" ? "bg-[#253b75] text-white shadow" : "text-[#123c73] hover:bg-white/70"}`}><Hotel className="mr-2 inline h-5 w-5"/>Hotel Booking</button>
            <button type="button" role="tab" aria-selected={service === "insurance"} onClick={() => setService("insurance")} className={`rounded-full px-6 py-3 font-bold transition ${service === "insurance" ? "bg-[#253b75] text-white shadow" : "text-[#123c73] hover:bg-white/70"}`}><ShieldCheck className="mr-2 inline h-5 w-5"/>Travel Insurance</button>
          </div>
        </div>

        <div className="mt-5 rounded-[2rem] bg-white/95 p-2 shadow-2xl backdrop-blur md:p-4">
          {service === "flight" ? <FlightSearch compact /> : null}
          {service === "hotel" ? <HotelSearch compact /> : null}
          {service === "insurance" ? <TravelInsuranceSearch /> : null}
        </div>
      </div>
    </section>
  );
}
