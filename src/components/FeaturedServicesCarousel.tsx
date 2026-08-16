import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import {
  featuredServiceImage,
  visibleFeaturedServices,
  type FeaturedService,
} from "@/lib/featured-services";
import { getFeaturedServices } from "@/lib/featured-services.functions";

/**
 * Homepage featured-services carousel backed by the CMS.
 * `items` is retained as a resilience fallback only when the public CMS request fails.
 */
export function FeaturedServicesCarousel({
  items,
  title = "What we can help you with",
  eyebrow = "Featured services",
  description,
}: {
  items: FeaturedService[];
  title?: string;
  eyebrow?: string;
  description?: string;
}) {
  const fetchFeaturedServices = useServerFn(getFeaturedServices);
  const featuredQuery = useQuery({
    queryKey: ["featured-services"],
    queryFn: () => fetchFeaturedServices(),
    staleTime: 30_000,
  });

  const sourceItems = featuredQuery.isError ? items : (featuredQuery.data ?? []);
  const cards = visibleFeaturedServices(sourceItems);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncArrows = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const maxScroll = node.scrollWidth - node.clientWidth;
    setCanScrollLeft(node.scrollLeft > 8);
    setCanScrollRight(node.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    syncArrows();
    const node = scrollerRef.current;
    if (!node) return;
    window.addEventListener("resize", syncArrows);
    return () => window.removeEventListener("resize", syncArrows);
  }, [syncArrows, cards.length]);

  const scrollBy = (direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = Math.max(280, Math.round(node.clientWidth * 0.8));
    node.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  if (featuredQuery.isPending || cards.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden bg-[linear-gradient(135deg,_#edf5ff_0%,_#f8f1ff_45%,_#fff1e7_100%)]"
      aria-labelledby="featured-services-heading"
    >
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#1268d8]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#ff651f]/14 blur-3xl" />
      <div className="container-page section-y relative">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e95516]">{eyebrow}</p>
            <h2
              id="featured-services-heading"
              className="mt-4 text-3xl font-extrabold text-[#123c73] md:text-4xl"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-5 text-base leading-relaxed text-[#546d88]">{description}</p>
            ) : null}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              aria-label="Scroll featured services left"
              className="grid h-11 w-11 place-items-center rounded-full border border-[#1268d8]/15 bg-white/95 text-[#0756c7] shadow-[0_12px_28px_-18px_rgba(7,86,199,0.55)] transition hover:-translate-y-0.5 hover:border-[#1268d8]/45 disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              aria-label="Scroll featured services right"
              className="grid h-11 w-11 place-items-center rounded-full border border-[#ff651f]/15 bg-white/95 text-[#e95516] shadow-[0_12px_28px_-18px_rgba(255,101,31,0.5)] transition hover:-translate-y-0.5 hover:border-[#ff651f]/45 disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="relative mt-8">
          <div
            ref={scrollerRef}
            onScroll={syncArrows}
            className="featured-scroller -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-4"
          >
            {cards.map((card, index) => (
              <FeaturedServiceCard key={card.id} service={card} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedServiceCard({ service, index }: { service: FeaturedService; index: number }) {
  const image = featuredServiceImage(service);
  const warm = index % 3 === 1;
  const green = index % 3 === 2;

  return (
    <Link
      to={service.link_path as "/"}
      className="group hover-lift w-[80vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/90 bg-white/95 shadow-[0_20px_50px_-34px_rgba(18,60,115,0.55)] backdrop-blur-sm transition duration-200 hover:border-[#1268d8]/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1268d8]/20 sm:w-[300px]"
    >
      <div
        className={`relative h-44 overflow-hidden ${
          warm
            ? "bg-[linear-gradient(135deg,_#ffedd5_0%,_#fed7aa_100%)]"
            : green
              ? "bg-[linear-gradient(135deg,_#d1fae5_0%,_#bfdbfe_100%)]"
              : "bg-[linear-gradient(135deg,_#dbeafe_0%,_#ddd6fe_100%)]"
        }`}
      >
        {image ? (
          <img
            src={image}
            alt={service.title}
            loading="lazy"
            width={1024}
            height={768}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
          />
        ) : null}
        <span
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b3f78]/70 via-[#0b3f78]/15 to-transparent"
          aria-hidden="true"
        />
        <span
          className={`absolute left-4 top-4 h-2.5 w-12 rounded-full ${
            warm ? "bg-[#ff651f]" : green ? "bg-[#16a77a]" : "bg-[#1268d8]"
          } shadow-sm`}
          aria-hidden="true"
        />
      </div>
      <div className="p-5">
        <h3 className="text-base font-extrabold text-[#123c73]">{service.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#5a7087]">
          {service.description}
        </p>
        <span
          className={`mt-4 inline-flex items-center gap-2 text-sm font-extrabold ${
            warm ? "text-[#e95516]" : green ? "text-[#128565]" : "text-[#0756c7]"
          }`}
        >
          Get started
          <ArrowRight
            className="h-4 w-4 transition group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
