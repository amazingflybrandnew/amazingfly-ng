import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { DocumentList } from "@/components/DocumentList";
import { DocumentRequestList } from "@/components/DocumentRequestList";

import { RequestTimeline } from "@/components/RequestTimeline";
import { getRequestDetail } from "@/lib/account.functions";
import { STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";

export const Route = createFileRoute("/requests/$id")({
  head: () => ({
    meta: [
      { title: "Request Details | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Follow the full progress of your Amazingfly Travels request: status timeline, trip details, uploaded documents and updates from our specialists.",
      },
      { property: "og:title", content: "Request Details | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Full timeline and documents for your Amazingfly Travels request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestDetailPage,
});

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-navy">{value || "-"}</dd>
    </div>
  );
}

function RequestDetailPage() {
  const { id } = Route.useParams();
  const { data: session } = useSessionQuery();
  const fetchDetail = useServerFn(getRequestDetail);

  const { data, isPending } = useQuery({
    queryKey: ["account", "request", id],
    queryFn: () => fetchDetail({ data: { id } }),
    enabled: Boolean(session?.user),
  });

  return (
    <AccountShell title="Request details" subtitle="Everything we hold on this travel request.">
      <Link
        to="/my-requests"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline-offset-4 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to my requests
      </Link>

      {isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : !data ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="text-base font-semibold text-navy">Request not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This request either does not exist or does not belong to your account.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="glass-card rounded-3xl p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {data.request.request_reference}
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-navy">
                  {data.request.service_type ?? "Travel request"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submitted {formatDate(data.request.created_at)}
                </p>
              </div>
              <span
                className={`rounded-full border px-4 py-1.5 text-xs font-bold ${statusTone(
                  data.request.request_status,
                )}`}
              >
                {STATUS_LABELS[data.request.request_status] ?? data.request.request_status}
              </span>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="From" value={data.request.origin_country ?? ""} />
              <Detail label="To" value={data.request.destination_country ?? ""} />
              <Detail label="Travel date" value={formatDate(data.request.travel_date)} />
              <Detail label="Return date" value={formatDate(data.request.return_date)} />
              <Detail label="Full name" value={data.request.full_name ?? ""} />
              <Detail label="Preferred contact" value={data.request.preferred_contact ?? ""} />
            </dl>

            {data.request.request_details ? (
              <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-navy">
                  {data.request.request_details}
                </p>
              </div>
            ) : null}
          </section>

          <section className="glass-card rounded-3xl p-6 md:p-8">
            <h2 className="mb-6 text-xl font-extrabold text-navy">Progress</h2>
            <RequestTimeline status={data.request.request_status} />

            {data.updates.length ? (
              <ul className="mt-8 space-y-3 border-t border-border pt-6">
                {data.updates.map((update) => (
                  <li key={update.id} className="rounded-2xl border border-white/70 bg-white/70 p-4">
                    <p className="text-sm font-bold text-navy">
                      {update.status
                        ? (STATUS_LABELS[update.status] ?? update.status)
                        : "Update"}
                    </p>
                    {update.message ? (
                      <p className="mt-1 text-sm text-muted-foreground">{update.message}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(update.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="glass-card rounded-3xl p-6 md:p-8">
            <h2 className="mb-2 text-xl font-extrabold text-navy">Documents required</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Documents our specialists have asked you to provide for this request.
            </p>
            <DocumentRequestList items={data.documentRequests} />
          </section>

          <section className="glass-card rounded-3xl p-6 md:p-8">
            <h2 className="mb-5 text-xl font-extrabold text-navy">Documents</h2>
            <DocumentList documents={data.documents} requestId={data.request.id} />
          </section>

          <RequestConversation requestId={data.request.id} />



        </div>
      )}
    </AccountShell>
  );
}
