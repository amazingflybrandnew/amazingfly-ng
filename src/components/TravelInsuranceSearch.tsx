import { useNavigate } from "react-router-dom";
import { ShieldCheck, Plane, HeartPulse, Luggage } from "lucide-react";

export function TravelInsuranceSearch() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[#0756c7]">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-bold">Travel Insurance</span>
          </div>
          <h3 className="text-2xl font-extrabold text-[#123c73]">
            Protect your journey before you fly
          </h3>
          <p className="mt-2 text-[#41608c]">
            Get assistance with travel insurance options for your international and domestic trips.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#33507a]">
            <span className="flex items-center gap-2"><Plane className="h-4 w-4" /> Trip protection</span>
            <span className="flex items-center gap-2"><Luggage className="h-4 w-4" /> Lost baggage support</span>
            <span className="flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Medical cover options</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/request?service=travel-insurance")}
          className="rounded-full bg-[#0756c7] px-7 py-3 font-bold text-white transition hover:opacity-90"
        >
          Get Travel Insurance
        </button>
      </div>
    </div>
  );
}
