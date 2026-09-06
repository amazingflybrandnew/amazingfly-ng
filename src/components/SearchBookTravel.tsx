import { useState } from "react";
import { Plane, Hotel, ShieldCheck } from "lucide-react";
import { TravelInsuranceSearch } from "@/components/TravelInsuranceSearch";
import { FLIGHT_BACKGROUND, HOTEL_BACKGROUND } from "@/lib/home-search-backgrounds";

const airportNames: Record<string, string> = {
  LOS: "Los Angeles International Airport",
  LHR: "London Heathrow Airport",
  JFK: "John F. Kennedy International Airport",
  DXB: "Dubai International Airport",
  CDG: "Paris Charles de Gaulle Airport",
};

export function SearchBookTravel() {
  const [service, setService] = useState("flight");
  const [from, setFrom] = useState("LOS");
  const [to, setTo] = useState("LHR");

  const background = service === "hotel" ? HOTEL_BACKGROUND : FLIGHT_BACKGROUND;

  const airportHint = (value: string) => airportNames[value.toUpperCase()] || "";

  return (
    <section className="relative min-h-[760px] overflow-hidden">
      <img src={background} className="absolute inset-0 h-full w-full object-cover" alt="Travel" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#ffffff55] via-[#ffffff80] to-[#ffffffcc]" />

      <div className="relative container-page pt-16">
        <h1 className="max-w-xl text-6xl font-black leading-none text-[#123c73]">Search.<br/>Book.<br/>Travel.</h1>

        <div className="mx-auto mt-20 max-w-xl rounded-full bg-white/75 p-2 shadow-lg backdrop-blur">
          <div className="flex justify-around">
            <button onClick={() => setService("flight")} className="px-8 py-3 font-bold text-[#123c73]"><Plane className="inline mr-2"/>Flight Search</button>
            <button onClick={() => setService("hotel")} className="px-8 py-3 font-bold text-[#123c73]"><Hotel className="inline mr-2"/>Hotel Booking</button>
            <button onClick={() => setService("insurance")} className="px-8 py-3 font-bold text-[#123c73]"><ShieldCheck className="inline mr-2"/>Travel Insurance</button>
          </div>
        </div>

        <div className="mt-5 rounded-[2rem] bg-white/95 p-8 shadow-2xl backdrop-blur">
          {service === "insurance" ? <TravelInsuranceSearch /> : (
            <>
              {service === "flight" && <div className="mb-5 flex gap-5 font-bold text-[#123c73]"><span>One way</span><span className="rounded-full bg-[#253b75] px-5 py-2 text-white">Round trip</span><span>Multi-city</span></div>}
              <div className="grid gap-5 md:grid-cols-3">
                <label className="text-[#123c73]">From<input value={from} onChange={e=>setFrom(e.target.value.toUpperCase())} className="mt-2 w-full rounded-xl border p-4" /> <small>{airportHint(from)}</small></label>
                <label className="text-[#123c73]">To<input value={to} onChange={e=>setTo(e.target.value.toUpperCase())} className="mt-2 w-full rounded-xl border p-4" /> <small>{airportHint(to)}</small></label>
                <label className="text-[#123c73]">Departure date<input className="mt-2 w-full rounded-xl border p-4" placeholder="dd/mm/yyyy" /></label>
                <label className="text-[#123c73]">Return date<input className="mt-2 w-full rounded-xl border p-4" placeholder="dd/mm/yyyy" /></label>
                <label className="text-[#123c73]">Passengers<input className="mt-2 w-full rounded-xl border p-4" value="1 passenger" readOnly /></label>
                <label className="text-[#123c73]">Cabin class<input className="mt-2 w-full rounded-xl border p-4" value="Economy" readOnly /></label>
              </div>
              <button className="mt-8 rounded-xl bg-gradient-to-r from-[#6674df] to-[#e05fa6] px-10 py-4 font-bold text-white">Search Flights</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
