import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";

import { AdminShell, PRIORITY_LABELS, priorityTone } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { getAdminRequests } from "@/lib/admin.functions";
import { formatMoney, paymentStatusLabel, paymentTone } from "@/lib/payment-status";
import { REQUEST_STATUSES, STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";

export const Route = createFileRoute("/admin/requests/")({
  head: () => ({
    meta: [
      { title: "Request Management | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Authorised staff view of every Amazingfly Travels application: reference, customer, service, destination, assigned staff, status and priority.",
      },
      { property: "og:title", content: "Request Management | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "Manage every customer travel application from one operations table.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRequestsPage,
});

const FILTERS = ["all", ...REQUEST_STATUSES] as const;

function AdminRequestsPage() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchRequests = useServerFn(getAdminRequests);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "requests", status, search],
    queryFn: () => fetchRequests({ data: { status, search } }),
  });

  const rows = data?.rows ?? [];

  return (
    <AdminShell
      title="Request management"
      subtitle="Every customer application, searchable by reference, name, service or destination."
    >
      <div className="glass-card rounded-3xl p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-soft"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reference, customer, destination"
              aria-label="Search requests"
              className="rounded-2xl border-white/60 bg-white/80 pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                aria-pressed={status === value}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  status === value
                    ? "border-transparent bg-navy text-white"
                    : "border-white/70 bg-white/70 text-navy-soft hover:bg-white"
                }`}
              >
                {value === "all" ? "All" : (STATUS_LABELS[value] ?? value)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="glass-card mt-6 flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="glass-card mt-6 rounded-3xl p-8 text-sm text-muted-foreground">
          We could not load the requests. Please refresh the page.
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card mt-6 rounded-3xl p-10 text-center text-sm text-muted-foreground">
          No requests match this view.
        </div>
      ) : (
        <div className="glass-card mt-6 overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-white/70 text-[11px] uppercase tracking-[0.14em] text-navy-soft">
                  <th className="px-5 py-4 font-bold">Reference</th>
                  <th className="px-5 py-4 font-bold">Customer</th>
                  <th className="px-5 py-4 font-bold">Service</th>
                  <th className="px-5 py-4 font-bold">Route</th>
                  <th className="px-5 py-4 font-bold">Airline / Hotel / Price</th>
                  <th className="px-5 py-4 font-bold">Payment</th>
                  <th className="px-5 py-4 font-bold">Submitted</th>
                  <th className="px-5 py-4 font-bold">Assigned</th>
                  <th className="px-5 py-4 font-bold">Status</th>
                  <th className="px-5 py-4 font-bold">Priority</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-white/60 transition-colors hover:bg-white/60"
                  >
                    <td className="px-5 py-4">
                      <Link
                        to="/admin/requests/$id"
                        params={{ id: row.id }}
                        className="font-bold text-navy underline-offset-4 hover:underline"
                      >
                        {row.request_reference}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-navy">{row.full_name}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-5 py-4 text-navy-soft">
                      {row.service_type || row.service_category || "—"}
                    </td>
                    <td className="px-5 py-4 text-navy-soft">
                      {(row.origin_country || "—") + " → " + (row.destination_country || "—")}
                    </td>
                    <td className="px-5 py-4 text-navy-soft">
                      {row.airline ? (
                        <>
                          <p className="font-semibold text-navy">
                            {row.airline}
                            {row.flight_number ? ` · ${row.flight_number}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.flight_price !== null
                              ? `${row.flight_currency ?? ""} ${row.flight_price.toLocaleString()}`
                              : "—"}
                          </p>
                        </>
                      ) : row.hotel_name ? (
                        <>
                          <p className="font-semibold text-navy">{row.hotel_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.hotel_check_in && row.hotel_check_out
                              ? `${formatDate(row.hotel_check_in)} – ${formatDate(row.hotel_check_out)} · `
                              : ""}
                            {row.hotel_price !== null
                              ? `${row.hotel_currency ?? ""} ${row.hotel_price.toLocaleString()}`
                              : "—"}
                          </p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4 text-navy-soft">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${paymentTone(row.payment_status)}`}
                      >
                        {paymentStatusLabel(row.payment_status)}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.payment_amount !== null
                          ? formatMoney(row.payment_amount, row.payment_currency ?? "NGN")
                          : "Fee to be confirmed"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.payment_reference ?? "No transaction yet"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-navy-soft">{formatDate(row.created_at)}</td>
                    <td className="px-5 py-4 text-navy-soft">
                      {row.assigned_staff_name ?? "Unassigned"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${statusTone(row.request_status)}`}
                      >
                        {STATUS_LABELS[row.request_status] ?? row.request_status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${priorityTone(row.priority)}`}
                      >
                        {PRIORITY_LABELS[row.priority] ?? row.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
