import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, UserRound } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAdminCustomerDetail, getAdminCustomers } from "@/lib/admin-ops.functions";
import { STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customer Management | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Authorised staff directory of Amazingfly Travels customers with their request history and uploaded documents.",
      },
      { property: "og:title", content: "Customer Management | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "Search customers and open their full travel request history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCustomersPage,
});

function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const fetchCustomers = useServerFn(getAdminCustomers);
  const fetchDetail = useServerFn(getAdminCustomerDetail);

  const list = useQuery({
    queryKey: ["admin", "customers", search],
    queryFn: () => fetchCustomers({ data: { search } }),
  });

  const detail = useQuery({
    queryKey: ["admin", "customer", selected],
    queryFn: () => fetchDetail({ data: { email: selected as string } }),
    enabled: Boolean(selected),
  });

  const rows = list.data ?? [];

  return (
    <AdminShell
      title="Customer management"
      subtitle="Everyone who has submitted a request or created an account, with their full history in one place."
    >
      <div className="glass-card rounded-3xl p-5 md:p-6">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-soft"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or phone"
            aria-label="Search customers"
            className="rounded-2xl border-white/60 bg-white/80 pl-10"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {list.isPending ? (
          <div className="glass-card flex items-center justify-center rounded-3xl p-16">
            <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
          </div>
        ) : rows.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
            No customers match this search yet.
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-white/70 text-[11px] uppercase tracking-[0.14em] text-navy-soft">
                    <th className="px-5 py-4 font-bold">Customer</th>
                    <th className="px-5 py-4 font-bold">Phone</th>
                    <th className="px-5 py-4 font-bold">Requests</th>
                    <th className="px-5 py-4 font-bold">Last request</th>
                    <th className="px-5 py-4 font-bold">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.email}
                      className={`cursor-pointer border-t border-white/60 transition-colors hover:bg-white/60 ${
                        selected?.toLowerCase() === row.email.toLowerCase() ? "bg-white/70" : ""
                      }`}
                      onClick={() => setSelected(row.email)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-navy">{row.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </td>
                      <td className="px-5 py-4 text-navy-soft">{row.phone || "—"}</td>
                      <td className="px-5 py-4 font-bold text-navy">{row.request_count}</td>
                      <td className="px-5 py-4 text-navy-soft">
                        {row.last_request_at ? formatDate(row.last_request_at) : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block rounded-full border border-sky/50 bg-sky-tint px-2.5 py-1 text-[11px] font-bold text-navy">
                          {row.account_status === "registered" ? "Registered" : "Guest"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <aside className="glass-card rounded-3xl p-6">
          {!selected ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <UserRound className="mx-auto mb-3 h-6 w-6 text-navy-soft" aria-hidden="true" />
              Select a customer to see their requests and documents.
            </div>
          ) : detail.isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-navy-soft" aria-hidden="true" />
            </div>
          ) : !detail.data ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              We could not load this customer.
            </p>
          ) : (
            <div>
              <h2 className="text-xl font-extrabold text-navy">
                {detail.data.customer.full_name || detail.data.customer.email}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{detail.data.customer.email}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
                    Phone
                  </dt>
                  <dd className="text-navy">{detail.data.customer.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
                    Nationality
                  </dt>
                  <dd className="text-navy">{detail.data.customer.nationality || "—"}</dd>
                </div>
              </dl>

              <Button asChild size="sm" className="btn-gradient mt-5 text-white">
                <Link to="/admin/messages" search={{ email: detail.data.customer.email }}>
                  Message this customer
                </Link>
              </Button>

              <h3 className="mt-7 text-sm font-bold uppercase tracking-[0.12em] text-navy-soft">
                Requests
              </h3>
              <ul className="mt-3 space-y-2">
                {detail.data.requests.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No requests yet.</li>
                ) : (
                  detail.data.requests.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-2xl border border-white/70 bg-white/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          to="/admin/requests/$id"
                          params={{ id: request.id }}
                          className="text-sm font-bold text-navy underline-offset-4 hover:underline"
                        >
                          {request.request_reference}
                        </Link>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(request.request_status)}`}
                        >
                          {STATUS_LABELS[request.request_status] ?? request.request_status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.service_type || "—"} · {request.destination_country || "—"} ·{" "}
                        {formatDate(request.created_at)}
                      </p>
                    </li>
                  ))
                )}
              </ul>

              <h3 className="mt-7 text-sm font-bold uppercase tracking-[0.12em] text-navy-soft">
                Documents
              </h3>
              <ul className="mt-3 space-y-2">
                {detail.data.documents.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No documents uploaded.</li>
                ) : (
                  detail.data.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm"
                    >
                      <p className="font-semibold text-navy">{doc.document_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.file_name} · {doc.request_reference} · {doc.review_status}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
