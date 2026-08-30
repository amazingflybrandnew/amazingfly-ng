import { Award, Headphones, ShieldCheck } from "lucide-react";
import { TravelInsuranceSearch } from "@/components/TravelInsuranceSearch";
import { HOTEL_BACKGROUND } from "@/lib/home-search-backgrounds";

const trustIndicators = [
  { icon: ShieldCheck, title: "Secure Payments", subtitle: "Processed by trusted providers" },
  { icon: Headphones, title: "24/7 Support", subtitle: "We're here for you" },
  { icon: Award, title: "Live Supplier Options", subtitle: "Review rates before booking" },
];

export function SearchBookTravel() {
  return (
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
  );
}
