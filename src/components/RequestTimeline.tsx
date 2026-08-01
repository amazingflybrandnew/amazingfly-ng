import { Check, Circle, Dot } from "lucide-react";

import { TIMELINE_STEPS, statusIndex, STATUS_LABELS } from "@/lib/request-status";

export function RequestTimeline({ status }: { status: string }) {
  const current = statusIndex(status);
  const cancelled = status === "cancelled";

  if (cancelled) {
    return (
      <div className="rounded-2xl border border-border bg-muted/50 p-5">
        <p className="text-sm font-semibold text-navy">This request was cancelled</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact our team if you would like to reopen it.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-6 pl-2">
      {TIMELINE_STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.status} className="relative flex gap-4">
            {index < TIMELINE_STEPS.length - 1 ? (
              <span
                className={`absolute left-[13px] top-8 h-[calc(100%+0.5rem)] w-px ${
                  done ? "bg-mint" : "bg-border"
                }`}
                aria-hidden="true"
              />
            ) : null}
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                done
                  ? "border-mint bg-mint text-white"
                  : active
                    ? "border-lavender bg-lavender-tint text-navy"
                    : "border-border bg-white/70 text-muted-foreground"
              }`}
            >
              {done ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : active ? (
                <Dot className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Circle className="h-3 w-3" aria-hidden="true" />
              )}
            </span>
            <div className="pt-0.5">
              <p
                className={`text-sm font-bold ${active || done ? "text-navy" : "text-muted-foreground"}`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {active ? (STATUS_LABELS[status] ?? step.hint) : step.hint}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
