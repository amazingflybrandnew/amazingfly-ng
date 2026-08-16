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
    <section className="surface-soft" aria-labelledby="featured-services-heading">
      <div className="container-page section-y">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">{eyebrow}</p>
            <h2 id="featured-services-heading" className="mt-4 text-3xl font-extrabold md:text-4xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              aria-label="Scroll featured services left"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/80 text-navy shadow-card transition hover:-translate-y-0.5 hover:border-sky/60 disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              aria-label="Scroll featured services right"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/80 text-navy shadow-card transition hover:-translate-y-0.5 hover:border-sky/60 disabled:pointer-events-none disabled:opacity-35"
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
            {cards.map((card) => (
              <FeaturedServiceCard key={card.id} service={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedServiceCard({ service }: { service: FeaturedService }) {
  const image = featuredServiceImage(service);

  return (
    <Link
      to={service.link_path as "/"}
      className="group hover-lift w-[80vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-card backdrop-blur-sm transition duration-200 hover:border-sky/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/30 sm:w-[300px]"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-sky-tint to-peach-tint">
        {image ? (
          <img
            src={image}
            alt={service.title}
            loading="lazy"
            width={1024}
            height={768}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
          />
        ) : null}
        <span
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-navy/45 to-transparent"
          aria-hidden="true"
        />
      </div>
      <div className="p-5">
        <h3 className="text-base font-bold text-navy">{service.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {service.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gradient-brand">
          Get started
          <ArrowRight
            className="h-4 w-4 text-orange transition group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
