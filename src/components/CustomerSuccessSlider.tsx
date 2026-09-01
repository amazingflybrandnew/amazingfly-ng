import { useState } from "react";

type CustomerSuccess = {
  id: string;
  title: string;
  description?: string | null;
  image_url: string;
};

type Props = {
  items?: CustomerSuccess[];
};

export function CustomerSuccessSlider({ items = [] }: Props) {
  const [paused, setPaused] = useState(false);

  const displayItems = items.length ? items : [
    {
      id: "placeholder-1",
      title: "UK Visa Support Completed",
      description: "",
      image_url: "",
    },
    {
      id: "placeholder-2",
      title: "Flight Reservation Prepared",
      description: "",
      image_url: "",
    },
  ];

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
          <div className={`flex w-max gap-5 ${paused ? "" : "animate-[customer-scroll_35s_linear_infinite]"}`}>
            {[...displayItems, ...displayItems].map((item, index) => (
              <article key={`${item.id}-${index}`} className="h-40 w-64 shrink-0 rounded-3xl border border-[#1268d8]/10 bg-[#f9fcff] p-5 shadow-sm">
                {item.image_url ? (
                  <img src={item.image_url} alt="Customer success document" className="h-16 w-full rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-16 place-items-center rounded-2xl bg-[#eaf3ff] text-sm font-semibold text-[#123c73]">
                    Receipt Preview
                  </div>
                )}
                <p className="mt-4 text-sm font-bold text-[#123c73]">{item.title}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
