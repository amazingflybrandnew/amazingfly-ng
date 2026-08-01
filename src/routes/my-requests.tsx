import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { getAccountOverview } from "@/lib/account.functions";
import { REQUEST_STATUSES, STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";

export const Route = createFileRoute("/my-requests")({
  head: () => ({
    meta: [
      { title: "My Travel Requests | Amazingfly.ng" },
      {
        name: "description",
        content:
          "See every visa, flight, hotel and travel document request you have submitted to Amazingfly Travels, with live status and reference numbers.",
      },
      { property: "og:title", content: "My Travel Requests | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Every Amazingfly Travels request you have submitted, in one list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyRequestsPage,
});

const FILTERS = ["all", ...REQUEST_STATUSES] as const;

function MyRequestsPage() {
  const { data: session } = useSessionQuery();
  const fetchOverview = useServerFn(getAccountOverview);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const { data, isPending } = useQuery({
    queryKey: ["account", "overview"],
    queryFn: () => fetchOverview(),
    enabled: Boolean(session?.user),
  });

  const requests = (data?.requests ?? []).filter(
    (request) => filter === "all" || request.request_status === filter,
  );

  return (
    <AccountShell
      title="My travel requests"
      subtitle="Every request you have submitted, with its current stage and reference number."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
              filter === value
                ? "border-navy bg-navy text-white"
                : "border-white/70 bg-white/70 text-navy-soft hover:text-navy"
            }`}
          >
            {value === "all" ? "All" : (STATUS_LABELS[value] ?? value)}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="text-base font-semibold text-navy">Nothing here yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {filter === "all"
              ? "You have not submitted a travel request yet."
              : "No requests at this stage right now."}
          </p>
          <Button asChild size="lg" className="btn-gradient mt-6 rounded-2xl text-white">
            <Link to="/request">Start a request</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                to="/requests/$id"
                params={{ id: request.id }}
                className="glass-card hover-lift flex h-full flex-col rounded-3xl p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-extrabold leading-snug text-navy">
                    {request.service_type ?? "Travel request"}
                  </p>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusTone(
                      request.request_status,
                    )}`}
                  >
                    {STATUS_LABELS[request.request_status] ?? request.request_status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {request.origin_country ?? "Nigeria"} →{" "}
                  {request.destination_country ?? "Destination"}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <dt className="font-bold uppercase tracking-wide">Reference</dt>
                    <dd className="mt-0.5 font-medium text-navy">{request.request_reference}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wide">Submitted</dt>
                    <dd className="mt-0.5 font-medium text-navy">
                      {formatDate(request.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wide">Travel date</dt>
                    <dd className="mt-0.5 font-medium text-navy">
                      {formatDate(request.travel_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-wide">Documents</dt>
                    <dd className="mt-0.5 font-medium text-navy">{request.document_count}</dd>
                  </div>
                </dl>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-navy">
                  View details
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
