import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  CheckCircle2,
  Globe2,
  Layers,
  Loader2,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { getAdminAnalytics, type CountEntry } from "@/lib/insights.functions";
import { formatMoney } from "@/lib/payment-status";
import { STATUS_LABELS } from "@/lib/request-status";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Travel Analytics Dashboard | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Amazingfly Travels analytics for staff: application volume, popular destinations, most requested services, revenue overview and completion rate.",
      },
      { property: "og:title", content: "Travel Analytics Dashboard | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Application, destination, service and revenue insight for Amazingfly Travels staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Layers;
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

function BarList({
  title,
  hint,
  icon: Icon,
  entries,
  format,
}: {
  title: string;
  hint: string;
  icon: typeof Globe2;
  entries: CountEntry[];
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...entries.map((entry) => entry.value));
  return (
    <section className="glass-card rounded-3xl p-6 md:p-7">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy">
        <Icon className="h-5 w-5" aria-hidden="true" />
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {entries.map((entry) => (
            <li key={entry.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-navy">{entry.label}</span>
                <span className="shrink-0 font-bold text-navy-soft">
                  {format ? format(entry.value) : entry.value}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lavender to-orange"
                  style={{ width: `${Math.round((entry.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AnalyticsPage() {
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => fetchAnalytics(),
  });

  return (
    <AdminShell
      title="Analytics"
      subtitle="How Amazingfly Travels is performing: demand, destinations, services, revenue and completion."
    >
      {isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : error || !data ? (
        <div className="glass-card rounded-3xl p-8 text-sm text-muted-foreground">
          We could not load analytics. Please refresh the page.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total applications"
              hint="All time"
              value={String(data.totals.applications)}
              icon={Layers}
              tint="bg-sky-tint"
            />
            <StatCard
              label="Completion rate"
              hint={`${data.totals.completed} completed`}
              value={`${data.totals.completionRate}%`}
              icon={CheckCircle2}
              tint="bg-mint-tint"
            />
            <StatCard
              label="Revenue received"
              hint={`${formatMoney(data.revenue.pending, data.revenue.currency)} pending`}
              value={formatMoney(data.revenue.total, data.revenue.currency)}
              icon={TrendingUp}
              tint="bg-peach-tint"
            />
            <StatCard
              label="Registered customers"
              hint={`${data.totals.active} active applications`}
              value={String(data.totals.customers)}
              icon={Users}
              tint="bg-lavender-tint"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BarList
              title="Applications per month"
              hint="Volume across the last six months."
              icon={BarChart3}
              entries={data.monthlyApplications}
            />
            <BarList
              title="Revenue per month"
              hint="Confirmed payments across the last six months."
              icon={TrendingUp}
              entries={data.revenue.monthly}
              format={(value) => formatMoney(value, data.revenue.currency)}
            />
            <BarList
              title="Popular destinations"
              hint="Where Amazingfly travellers are heading."
              icon={Globe2}
              entries={data.destinations}
            />
            <BarList
              title="Most requested services"
              hint="Demand by service across all applications."
              icon={Package}
              entries={data.services}
            />
          </div>

          <BarList
            title="Applications by status"
            hint="Where every application currently sits in the workflow."
            icon={Layers}
            entries={data.statuses.map((entry) => ({
              label: STATUS_LABELS[entry.label] ?? entry.label,
              value: entry.value,
            }))}
          />
        </div>
      )}
    </AdminShell>
  );
}
