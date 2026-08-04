import { Check, Circle, ArrowRight } from "lucide-react";

import type { WorkflowStatus } from "@/lib/workflow-status";

type Step = {
  key: string;
  label: string;
  message: string;
};

const STEPS: Step[] = [
  {
    key: "submitted",
    label: "Application Submitted",
    message: "Your application has been submitted.",
  },
  {
    key: "documents_uploaded",
    label: "Documents Uploaded",
    message: "Your documents have been received.",
  },
  {
    key: "payment_received",
    label: "Payment Received",
    message: "Payment confirmed. Your application is ready for processing.",
  },
  {
    key: "processing",
    label: "Processing",
    message: "Our team is currently processing your request.",
  },
  {
    key: "completed",
    label: "Completed",
    message: "Your request has been completed.",
  },
];

/** Maps the derived workflow status onto the five customer-facing steps. */
export function workflowStepIndex(status: WorkflowStatus): number {
  switch (status) {
    case "completed":
      return 4;
    case "processing":
      return 3;
    case "payment_successful":
      return 2;
    case "payment_pending":
    case "documents_uploaded":
      return 1;
    default:
      return 0;
  }
}

function pendingNote(status: WorkflowStatus): string | null {
  if (status === "quotation_pending") return "Awaiting quotation from our specialists.";
  if (status === "payment_pending") return "Payment pending — complete payment to begin processing.";
  return null;
}

export function WorkflowTimeline({ status }: { status: WorkflowStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border border-border bg-muted/50 p-5">
        <p className="text-sm font-semibold text-navy">This request was cancelled</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact our team if you would like to reopen it.
        </p>
      </div>
    );
  }

  const current = workflowStepIndex(status);
  const note = pendingNote(status);

  return (
    <div>
      <ol className="relative space-y-6 pl-2">
        {STEPS.map((step, index) => {
          const done = index < current || (index === current && status === "completed");
          const active = index === current && !done;
          return (
            <li key={step.key} className="relative flex gap-4">
              {index < STEPS.length - 1 ? (
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
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
                  {active && note ? note : step.message}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
