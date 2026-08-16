import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2, Search, ShieldCheck, UserRound } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getAdminCustomerDetail,
  getAdminCustomers,
  type AdminCustomer,
} from "@/lib/admin-customer.functions";
import {
  formatMoney,
  paymentStatusLabel,
  paymentTone,
} from "@/lib/payment-status";
import { STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customer Management | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Authorised staff directory of Amazingfly Travels customers with their request, payment and document history.",
      },
      { property: "og:title", content: "Customer Management | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "Search customers and open their operational travel history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCustomersPage,
});

type SelectedCustomer = {
  key: string;
  email: string;
  userId: string | null;
};

function customerKey(customer: Pick<AdminCustomer, "user_id" | "email">) {
  return customer.user_id
    ? `user:${customer.user_id}`
    : `guest:${customer.email.trim().toLowerCase()}`;
}

function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedCustomer | null>(null);

  const fetchCustomers = useServerFn(getAdminCustomers);
  const fetchDetail = useServerFn(getAdminCustomerDetail);

  const list = useQuery({
    queryKey: ["admin", "customers", search],
    queryFn: () => fetchCustomers({ data: { search } }),
  });

  const detail = useQuery({
    queryKey: ["admin", "customer", selected?.key],
    queryFn: () =>
      fetchDetail({
        data: {
          email: selected!.email,
          user_id: selected!.userId,
        },
      }),
    enabled: Boolean(selected),
  });

  const rows = list.data ?? [];

  return (
    <AdminShell
      title="Customer management"
      subtitle="Everyone who has submitted a request or created an account, with requests, payments and documents in one place."
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {list.isPending ? (
          <div className="glass-card flex items-center justify-center rounded-3xl p-16">
            <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
          </div>
        ) : list.isError ? (
          <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
            We could not load customers right now.
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
                  {rows.map((row) => {
                    const key = customerKey(row);
                    const isSelected = selected?.key === key;
                    return (
                      <tr
                        key={key}
                        className={`cursor-pointer border-t border-white/60 transition-colors hover:bg-white/60 ${
                          isSelected ? "bg-white/70" : ""
                        }`}
                        onClick={() =>
                          setSelected({
                            key,
                            email: row.email,
                            userId: row.user_id,
                          })
                        }
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <aside className="glass-card rounded-3xl p-6">
          {!selected ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <UserRound className="mx-auto mb-3 h-6 w-6 text-navy-soft" aria-hidden="true" />
              Select a customer to see requests, payments and documents.
            </div>
          ) : detail.isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-navy-soft" aria-hidden="true" />
            </div>
          ) : detail.isError ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              We could not load this customer right now.
            </p>
          ) : !detail.data ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              We could not find this customer.
            </p>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-navy">
                    {detail.data.customer.full_name || detail.data.customer.email}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{detail.data.customer.email}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky/50 bg-sky-tint px-2.5 py-1 text-[11px] font-bold text-navy">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {detail.data.customer.account_status === "registered" ? "Registered" : "Guest"}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">Phone</dt>
                  <dd className="text-navy">{detail.data.customer.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
                    Nationality
                  </dt>
                  <dd className="text-navy">{detail.data.customer.nationality || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
                    Requests
                  </dt>
                  <dd className="text-navy">{detail.data.customer.request_count}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-navy-soft">
                    Customer since
                  </dt>
                  <dd className="text-navy">
                    {detail.data.customer.created_at ? formatDate(detail.data.customer.created_at) : "—"}
                  </dd>
                </div>
              </dl>

              {detail.data.customer.user_id ? (
                <p className="mt-3 break-all text-[11px] text-muted-foreground">
                  Account ID: {detail.data.customer.user_id}
                </p>
              ) : null}

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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          to="/admin/requests/$id"
                          params={{ id: request.id }}
                          className="text-sm font-bold text-navy underline-offset-4 hover:underline"
                        >
                          {request.request_reference}
                        </Link>
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(request.request_status)}`}
                          >
                            {STATUS_LABELS[request.request_status] ?? request.request_status}
                          </span>
                          <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[11px] font-bold text-navy-soft">
                            {request.ownership === "account" ? "Account" : "Unclaimed guest"}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.service_type || "—"} · {request.destination_country || "—"} ·{" "}
                        {formatDate(request.created_at)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-navy-soft">
                        {paymentStatusLabel(request.payment_status)}
                      </p>
                    </li>
                  ))
                )}
              </ul>

              <h3 className="mt-7 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-navy-soft">
                <CreditCard className="h-4 w-4" aria-hidden="true" /> Payments
              </h3>
              <ul className="mt-3 space-y-2">
                {detail.data.payments.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No payment transactions yet.</li>
                ) : (
                  detail.data.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-navy">
                            {formatMoney(payment.amount, payment.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.provider || "—"} · {payment.request_reference || "—"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${paymentTone(payment.status)}`}
                        >
                          {paymentStatusLabel(payment.status)}
                        </span>
                      </div>
                      <p className="mt-2 break-all text-xs text-muted-foreground">
                        {payment.transaction_reference || "No transaction reference"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {payment.paid_at
                          ? `Paid ${formatDate(payment.paid_at)}`
                          : `Created ${formatDate(payment.created_at)}`}
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
