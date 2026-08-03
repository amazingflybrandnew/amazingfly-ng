import { useEffect, useState } from "react";
import { BedDouble, Sparkles } from "lucide-react";

const MESSAGES = [
  "Searching the best stays for you…",
  "Finding available hotels and prices…",
  "Comparing rooms, boards and cancellation policies…",
  "Almost there — sorting the best value stays…",
];

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <article
      className="overflow-hidden rounded-3xl border border-white/70 bg-white/70 shadow-card backdrop-blur-sm"
      style={{ animation: `fade-in 0.4s ease-out ${delay}ms both` }}
      aria-hidden="true"
    >
      <div className="flex flex-col md:flex-row">
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-sky-tint via-lavender-tint to-peach-tint md:h-auto md:w-64 md:shrink-0">
          <span className="absolute inset-0 animate-pulse bg-white/30" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-2/3 animate-pulse rounded-full bg-sky-tint" />
            <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-lavender-tint" />
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 w-24 animate-pulse rounded-full bg-white/80" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-mint-tint" />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 md:items-end">
            <div className="h-7 w-28 animate-pulse rounded-full bg-peach-tint" />
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/80" />
            <div className="flex gap-2">
              <div className="h-9 w-28 animate-pulse rounded-full bg-white/80" />
              <div className="h-9 w-28 animate-pulse rounded-full bg-sky-tint" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Premium loading state shown while hotel availability is being fetched. */
export function HotelSearchSkeleton({ count = 3 }: { count?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % MESSAGES.length), 2600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <div className="glass-card flex flex-wrap items-center gap-3 rounded-3xl border border-white/70 px-5 py-4">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-tint to-peach-tint">
          <BedDouble className="h-5 w-5 text-orange" aria-hidden="true" />
          <span className="absolute inset-0 animate-ping rounded-2xl border border-orange/30" />
        </span>
        <div className="min-w-0">
          <p key={index} className="animate-fade-in text-sm font-bold text-navy">
            {MESSAGES[index]}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-orange" aria-hidden="true" />
            Live availability can take a few moments — thanks for your patience.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} delay={i * 120} />
        ))}
      </div>
    </div>
  );
}
