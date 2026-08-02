import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Layers,
  Loader2,
  Plane,
} from "lucide-react";

import { AdminShell, priorityTone, PRIORITY_LABELS } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { getAdminRequests } from "@/lib/admin.functions";
import { STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Travel Operations Dashboard | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Internal Amazingfly Travels operations dashboard for authorised staff: live request volumes, review queues and application progress.",
      },
      { property: "og:title", content: "Travel Operations Dashboard | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Authorised staff area for managing Amazingfly Travels applications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOverviewPage,
});

function SummaryCard({
  label,
  hint,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  hint: string;
  value: number;
  icon: typeof Plane;
  tint: string;
}) {
  return (
    <div className="glass-card hover-lift rounded-3xl p-5">
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tint}`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 text-navy" />
      </span>
      <p className="mt-4 text-3xl font-extrabold text-navy">{value}</p>
      <p className="mt-1 text-sm font-semibold text-navy-soft">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function AdminOverviewPage() {
  const fetchRequests = useServerFn(getAdminRequests);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "requests", "overview"],
    queryFn: () => fetchRequests({ data: {} }),
  });

  const stats = data?.stats;
  const recent = (data?.rows ?? []).slice(0, 8);

  return (
    <AdminShell
      title="Travel operations"
      subtitle="Live view of every application moving through Amazingfly Travels."
      actions={
        <Button asChild className="btn-gradient text-white">
          <Link to="/admin/requests">
            Manage requests
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      {isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="glass-card rounded-3xl p-8 text-sm text-muted-foreground">
          We could not load the operations data. Please refresh the page.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Total Requests"
              hint="Total applications"
              value={stats?.total ?? 0}
              icon={Layers}
              tint="bg-sky-tint"
            />
            <SummaryCard
              label="New Requests"
              hint="Awaiting review"
              value={stats?.newRequests ?? 0}
              icon={ClipboardList}
              tint="bg-lavender-tint"
            />
            <SummaryCard
              label="Pending Documents"
              hint="Customer action required"
              value={stats?.documentsRequired ?? 0}
              icon={FileWarning}
              tint="bg-peach-tint"
            />
            <SummaryCard
              label="Processing"
              hint="Currently active"
              value={stats?.processing ?? 0}
              icon={Plane}
              tint="bg-sky-tint"
            />
            <SummaryCard
              label="Completed"
              hint="Successfully completed"
              value={stats?.completed ?? 0}
              icon={CheckCircle2}
              tint="bg-mint-tint"
            />
          </div>

          <section className="glass-card rounded-3xl p-6 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-navy">Latest applications</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The eight most recent requests submitted on Amazingfly.ng.
                </p>
              </div>
              <Button asChild variant="ghost" className="text-navy-soft">
                <Link to="/admin/requests">View all</Link>
              </Button>
            </div>

            {recent.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="mt-6 space-y-3">
                {recent.map((row) => (
                  <li key={row.id}>
                    <Link
                      to="/admin/requests/$id"
                      params={{ id: row.id }}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-4 transition-colors hover:bg-white"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-navy">
                          {row.request_reference} · {row.full_name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.service_type || row.service_category || "Travel service"} ·{" "}
                          {row.origin_country || "—"} → {row.destination_country || "—"} ·{" "}
                          {formatDate(row.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${priorityTone(row.priority)}`}
                        >
                          {PRIORITY_LABELS[row.priority] ?? row.priority}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(row.request_status)}`}
                        >
                          {STATUS_LABELS[row.request_status] ?? row.request_status}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
