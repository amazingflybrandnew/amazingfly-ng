import { useState } from "react";
import { Award, Headphones, ShieldCheck } from "lucide-react";
import { TravelInsuranceSearch } from "@/components/TravelInsuranceSearch";
import { FLIGHT_BACKGROUND, HOTEL_BACKGROUND } from "@/lib/home-search-backgrounds";

const services = {
  flight: { title: "Flight Booking", image: FLIGHT_BACKGROUND },
  hotel: { title: "Hotel Booking", image: HOTEL_BACKGROUND },
  insurance: { title: "Travel Insurance", image: HOTEL_BACKGROUND },
};

const trustIndicators = [
  { icon: ShieldCheck, title: "Secure Payments", subtitle: "Processed by trusted providers" },
  { icon: Headphones, title: "24/7 Support", subtitle: "We're here for you" },
  { icon: Award, title: "Live Supplier Options", subtitle: "Review rates before booking" },
];

export function SearchBookTravel() {
  const [service, setService] = useState<keyof typeof services>("flight");
  const active = services[service];

  return (
    <section className="relative isolate overflow-hidden">
      <img src={active.image} alt={active.title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white/90" />
      <div className="container-page relative py-12">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-white/90 p-6 shadow-xl">
          <div className="mb-6 flex flex-wrap justify-center gap-3">
            {(Object.keys(services) as Array<keyof typeof services>).map((key) => (
              <button key={key} onClick={() => setService(key)} className={`rounded-full px-6 py-3 font-bold ${service === key ? "bg-[#f47b4d] text-white" : "bg-white text-[#123c73] border"}`}>
                {services[key].title}
              </button>
            ))}
          </div>

          {service === "insurance" ? <TravelInsuranceSearch /> : (
            <div className="space-y-5">
              <h2 className="text-4xl font-extrabold text-[#123c73]">{active.title}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded-xl border p-4" placeholder="From" />
                <input className="rounded-xl border p-4" placeholder="To" />
                <input className="rounded-xl border p-4" placeholder="Departure date" />
                <input className="rounded-xl border p-4" placeholder="Passengers / Guests" />
              </div>
              <button className="rounded-xl bg-[#0756c7] px-8 py-4 font-bold text-white">Search</button>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-8">
          {trustIndicators.map((item) => <div key={item.title} className="flex gap-2 text-[#123c73]"><item.icon /><span><b>{item.title}</b><br />{item.subtitle}</span></div>)}
        </div>
      </div>
    </section>
  );
}
