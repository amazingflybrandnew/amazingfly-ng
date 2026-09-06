import { useState } from "react";
import type { CustomerSuccess } from "@/lib/customer-successes";

type Props = {
  items?: CustomerSuccess[];
};

export function CustomerSuccessSlider({ items = [] }: Props) {
  const [paused, setPaused] = useState(false);

  return (
    <section className="overflow-hidden bg-white py-12" aria-labelledby="customer-successes-title">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 id="customer-successes-title" className="text-3xl font-extrabold text-[#123c73]">
            Recent Customer Successes
          </h2>
          <p className="mt-3 text-sm text-[#5b7189]">
            Helping travellers prepare their journeys with trusted travel support services.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#1268d8]/20 bg-[#f9fcff] px-6 py-10 text-center text-sm text-[#5b7189]">
            Verified customer stories will appear here once they are published.
          </div>
        ) : (
          <div
            className="mt-8 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            <div
              className="customer-success-track flex w-max gap-5"
              style={{ animationPlayState: paused ? "paused" : "running" }}
            >
              {[...items, ...items].map((item, index) => {
                const duplicate = index >= items.length;

                return (
                  <article
                    key={`${item.id}-${index}`}
                    aria-hidden={duplicate || undefined}
                    className="min-h-48 w-72 shrink-0 rounded-3xl border border-[#1268d8]/10 bg-[#f9fcff] p-5 shadow-sm"
                  >
                    <img
                      src={item.image_url}
                      alt={duplicate ? "" : item.title}
                      className="h-24 w-full rounded-2xl object-cover"
                      loading="lazy"
                    />
                    <h3 className="mt-4 text-sm font-bold text-[#123c73]">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#5b7189]">
                        {item.description}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
