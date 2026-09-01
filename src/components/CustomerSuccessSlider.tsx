import { useState } from "react";

const successes = [
  "UK Visa Support Completed",
  "Flight Reservation Prepared",
  "Travel Insurance Certificate Issued",
  "Travel Documentation Assistance",
  "Customer Payment Receipt",
];

export function CustomerSuccessSlider() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="overflow-hidden bg-white py-12">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold text-[#123c73]">Recent Customer Successes</h2>
          <p className="mt-3 text-sm text-[#5b7189]">
            Helping travellers prepare their journeys with trusted travel support services.
          </p>
        </div>

        <div
          className="mt-8 overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div
            className={`flex w-max gap-5 ${paused ? "" : "animate-[customer-scroll_35s_linear_infinite]"}`}
          >
            {[...successes, ...successes].map((item, index) => (
              <article
                key={`${item}-${index}`}
                className="h-36 w-64 shrink-0 rounded-3xl border border-[#1268d8]/10 bg-[#f9fcff] p-5 shadow-sm"
              >
                <div className="grid h-16 place-items-center rounded-2xl bg-[#eaf3ff] text-sm font-semibold text-[#123c73]">
                  Receipt Preview
                </div>
                <p className="mt-4 text-sm font-bold text-[#123c73]">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
