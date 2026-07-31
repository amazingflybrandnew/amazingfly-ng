import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-navy-tint">
      <div className="container-page py-16 md:py-20">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">{eyebrow}</p>
        ) : null}
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="container-page section-y">
      <div className="max-w-3xl space-y-6 text-base leading-relaxed text-muted-foreground [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:md:text-2xl [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-orange/30 bg-orange-tint p-5">
      <p className="text-sm font-medium leading-relaxed text-navy">{children}</p>
    </div>
  );
}
