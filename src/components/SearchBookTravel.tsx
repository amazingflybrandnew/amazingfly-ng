import { Award, Headphones, ShieldCheck } from "lucide-react";
import { TravelInsuranceSearch } from "@/components/TravelInsuranceSearch";
import { FLIGHT_BACKGROUND, HOTEL_BACKGROUND } from "@/lib/home-search-backgrounds";

const trustIndicators = [
  { icon: ShieldCheck, title: "Secure Payments", subtitle: "Processed by trusted providers" },
  { icon: Headphones, title: "24/7 Support", subtitle: "We're here for you" },
  { icon: Award, title: "Live Supplier Options", subtitle: "Review rates before booking" },
];

function TravelCard({ title, image }: { title: string; image: string }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] min-h-[340px] shadow-xl">
      <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="relative flex h-full min-h-[340px] flex-col justify-end p-8 text-white">
        <h3 className="text-3xl font-extrabold">{title}</h3>
        <p className="mt-2 text-white/90">Search and book your next journey with Amazingfly.</p>
      </div>
    </div>
  );
}

export function SearchBookTravel() {
  return (
    <>
      <section className="bg-white py-12">
        <div className="container-page grid gap-8 md:grid-cols-2">
          <TravelCard title="Flight Booking" image={FLIGHT_BACKGROUND} />
          <TravelCard title="Hotel Booking" image={HOTEL_BACKGROUND} />
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#0b1f3a]">
        <div className="absolute inset-0 -z-10">
          <img src={HOTEL_BACKGROUND} alt="Traveller preparing for a protected journey" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/15 to-white/75" />
        </div>
        <div className="container-page relative pb-14 pt-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-[#6b4bd4]"><ShieldCheck className="h-4 w-4" /> Travel with confidence</span>
              <h2 className="mt-6 text-4xl font-extrabold text-[#123c73] md:text-6xl">Protect your journey.</h2>
            </div>
            <ul className="flex flex-wrap gap-6">{trustIndicators.map((item)=><li key={item.title} className="flex items-center gap-3"><item.icon className="h-5 w-5 text-[#0756c7]" /><span><b className="block text-[#123c73]">{item.title}</b><small>{item.subtitle}</small></span></li>)}</ul>
          </div>
          <div className="mt-12 md:mt-20">
            <div className="mx-auto w-fit rounded-full border bg-white/80 px-6 py-3 text-sm font-bold text-[#123c73]">Travel Insurance</div>
            <div className="mt-4 rounded-[2rem] border bg-white/95 p-3 shadow-xl md:p-6">
              <TravelInsuranceSearch />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
