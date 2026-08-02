import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BellRing,
  CreditCard,
  FileWarning,
  Loader2,
  Plane,
  RefreshCw,
  UserPlus,
} from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { getAdminAlerts, type AdminAlert } from "@/lib/insights.functions";
import { formatDate } from "@/lib/request-status";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Operations Notification Centre | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Staff notification centre for Amazingfly Travels: new applications, new customers, missing documents and payments received.",
      },
      { property: "og:title", content: "Operations Notification Centre | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Live operational alerts for authorised Amazingfly Travels staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminNotificationsPage,
});

const KIND_META: Record<
  AdminAlert["kind"],
  { label: string; icon: typeof Plane; chip: string }
> = {
  new_request: { label: "New application", icon: Plane, chip: "bg-sky-tint text-navy border-sky/50" },
  new_customer: {
    label: "New customer",
    icon: UserPlus,
    chip: "bg-lavender-tint text-navy border-lavender/50",
  },
  missing_document: {
    label: "Missing document",
    icon: FileWarning,
    chip: "bg-peach-tint text-navy border-orange/40",
  },
  payment_received: {
    label: "Payment received",
    icon: CreditCard,
    chip: "bg-mint-tint text-navy border-mint/50",
  },
};

function CountCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
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
    </div>
  );
}

function AdminNotificationsPage() {
  const fetchAlerts = useServerFn(getAdminAlerts);
  const { data, isPending, isFetching, refetch, error } = useQuery({
    queryKey: ["admin", "alerts"],
    queryFn: () => fetchAlerts(),
    refetchInterval: 60_000,
  });

  return (
    <AdminShell
      title="Notification centre"
      subtitle="Everything that needs attention across Amazingfly Travels operations, newest first."
      actions={
        <Button
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="bg-white/70"
        >
          <RefreshCw
            className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </Button>
      }
    >
      {isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="glass-card rounded-3xl p-8 text-sm text-muted-foreground">
          We could not load the notification feed. Please refresh the page.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CountCard
              label="New applications"
              value={data?.counts.newRequests ?? 0}
              icon={Plane}
              tint="bg-sky-tint"
            />
            <CountCard
              label="New customers"
              value={data?.counts.newCustomers ?? 0}
              icon={UserPlus}
              tint="bg-lavender-tint"
            />
            <CountCard
              label="Missing documents"
              value={data?.counts.missingDocuments ?? 0}
              icon={FileWarning}
              tint="bg-peach-tint"
            />
            <CountCard
              label="Payments received"
              value={data?.counts.paymentsReceived ?? 0}
              icon={CreditCard}
              tint="bg-mint-tint"
            />
          </div>

          <section className="glass-card rounded-3xl p-6 md:p-7">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy">
              <BellRing className="h-5 w-5" aria-hidden="true" />
              Activity feed
            </h2>

            {(data?.alerts.length ?? 0) === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">Nothing needs attention right now.</p>
            ) : (
              <ul className="mt-6 space-y-3">
                {data?.alerts.map((alert) => {
                  const meta = KIND_META[alert.kind];
                  const Icon = meta.icon;
                  const body = (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-4 transition-colors hover:bg-white">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.chip}`}
                          aria-hidden="true"
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-navy">{alert.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {alert.detail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.chip}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(alert.created_at)}
                        </span>
                      </div>
                    </div>
                  );

                  return (
                    <li key={alert.id}>
                      {alert.request_id ? (
                        <Link to="/admin/requests/$id" params={{ id: alert.request_id }}>
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
