import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Bell,
  BedDouble,
  CheckCircle2,
  FileWarning,
  Loader2,
  Plane,
  Sparkles,
} from "lucide-react";


import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { DocumentRequestList } from "@/components/DocumentRequestList";

import { Button } from "@/components/ui/button";
import { getAccountOverview } from "@/lib/account.functions";
import { STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";
import { formatMoney, paymentStatusLabel, paymentTone } from "@/lib/payment-status";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Your Travel Dashboard | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Track your Amazingfly Travels visa, flight, hotel and document requests, see live progress and manage your uploads in one premium dashboard.",
      },
      { property: "og:title", content: "Your Travel Dashboard | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Live progress on every Amazingfly Travels request you have submitted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
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
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardPage() {
  const { data: session } = useSessionQuery();
  const fetchOverview = useServerFn(getAccountOverview);
  const { data, isPending, error } = useQuery({
    queryKey: ["account", "overview"],
    queryFn: () => fetchOverview(),
    enabled: Boolean(session?.user),
  });

  const flightRequests = (data?.requests ?? []).filter(
    (request) =>
      Boolean(request.airline) ||
      (request.service_type ?? "").toLowerCase().includes("flight"),
  );

  const hotelRequests = (data?.requests ?? []).filter(
    (request) =>
      Boolean(request.hotel_name) ||
      (request.service_type ?? "").toLowerCase().includes("hotel"),
  );


  const firstName = (session?.user?.full_name || session?.user?.email || "").split(" ")[0];

  return (
    <AccountShell
      title={`Welcome back, ${firstName || "traveller"} 👋`}
      subtitle="Track your travel requests and manage your documents easily."
    >
      {isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="glass-card rounded-3xl p-8 text-sm text-muted-foreground">
          We could not load your dashboard just now. Please refresh the page.
        </div>
      ) : data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total requests"
              value={data.totals.total}
              icon={Plane}
              tint="bg-sky-tint"
            />
            <StatCard
              label="Active requests"
              value={data.totals.active}
              icon={Sparkles}
              tint="bg-lavender-tint"
            />
            <StatCard
              label="Completed"
              value={data.totals.completed}
              icon={CheckCircle2}
              tint="bg-mint-tint"
            />
            <StatCard
              label="Pending documents"
              value={data.totals.documentsRequired}
              icon={FileWarning}
              tint="bg-peach-tint"
            />
          </div>

          {data.documentRequests.some(
            (item) => item.uploaded_status === "pending" || item.uploaded_status === "rejected",
          ) ? (
            <section className="glass-card rounded-3xl border-orange/30 p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy">
                  <FileWarning className="h-5 w-5" aria-hidden="true" />
                  Documents required
                </h2>
                <Link
                  to="/documents"
                  className="text-sm font-semibold text-navy underline-offset-4 hover:underline"
                >
                  View all documents
                </Link>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Our specialists need these documents to move your request forward.
              </p>
              <div className="mt-5">
                <DocumentRequestList
                  items={data.documentRequests.filter(
                    (item) =>
                      item.uploaded_status === "pending" || item.uploaded_status === "rejected",
                  )}
                  showReference
                />
              </div>
            </section>
          ) : null}

          {flightRequests.length > 0 ? (
            <section className="glass-card rounded-3xl p-6 md:p-8">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy">
                <Plane className="h-5 w-5" aria-hidden="true" />
                My flight requests
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Flights you selected from live search. Our team reviews each one before booking.
              </p>
              <ul className="mt-5 space-y-3">
                {flightRequests.slice(0, 5).map((request) => (
                  <li key={request.id}>
                    <Link
                      to="/requests/$id"
                      params={{ id: request.id }}
                      className="hover-lift flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/70 p-5"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-navy-soft">
                          {request.request_reference}
                        </p>
                        <p className="mt-1 text-base font-bold text-navy">
                          {(request.flight_origin ?? request.origin_country ?? "—") +
                            " → " +
                            (request.flight_destination ?? request.destination_country ?? "—")}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.airline ?? "Airline to be confirmed"}
                          {request.flight_number ? ` · ${request.flight_number}` : ""} ·{" "}
                          {formatDate(request.flight_departure_at ?? request.travel_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-navy">
                          {request.flight_price !== null
                            ? formatMoney(request.flight_price, request.flight_currency ?? "NGN")
                            : formatMoney(request.agreed_fee, "NGN")}
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-bold ${statusTone(
                            request.request_status,
                          )}`}
                        >
                          {STATUS_LABELS[request.request_status] ?? request.request_status}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hotelRequests.length > 0 ? (
            <section className="glass-card rounded-3xl p-6 md:p-8">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy">
                <BedDouble className="h-5 w-5" aria-hidden="true" />
                My hotel requests
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Stays you selected from live search. Our team confirms availability before booking.
              </p>
              <ul className="mt-5 space-y-3">
                {hotelRequests.slice(0, 5).map((request) => (
                  <li key={request.id}>
                    <Link
                      to="/requests/$id"
                      params={{ id: request.id }}
                      className="hover-lift flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/70 p-5"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-navy-soft">
                          {request.request_reference}
                        </p>
                        <p className="mt-1 text-base font-bold text-navy">
                          {request.hotel_name ?? "Hotel to be confirmed"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.hotel_location ?? request.destination_country ?? "—"} ·{" "}
                          {formatDate(request.hotel_check_in ?? request.travel_date)}
                          {" – "}
                          {formatDate(request.hotel_check_out ?? request.return_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-navy">
                          {request.hotel_price !== null
                            ? formatMoney(request.hotel_price, request.hotel_currency ?? "NGN")
                            : formatMoney(request.agreed_fee, "NGN")}
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-bold ${statusTone(
                            request.request_status,
                          )}`}
                        >
                          {STATUS_LABELS[request.request_status] ?? request.request_status}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="glass-card rounded-3xl p-6 md:p-8">


            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-navy">My applications</h2>
              <Link
                to="/my-requests"
                className="text-sm font-semibold text-navy underline-offset-4 hover:underline"
              >
                View all
              </Link>
            </div>

            {data.requests.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center">
                <p className="text-base font-semibold text-navy">No requests yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start your first visa, flight, hotel or travel document request.
                </p>
                <Button asChild size="lg" className="btn-gradient mt-6 rounded-2xl text-white">
                  <Link to="/request">
                    Start a request
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-6 space-y-4">
                {data.requests.slice(0, 4).map((request) => (
                  <li key={request.id}>
                    <Link
                      to="/requests/$id"
                      params={{ id: request.id }}
                      className="hover-lift block rounded-2xl border border-white/70 bg-white/70 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold text-navy">
                            {request.service_type ?? "Travel request"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {request.origin_country ?? "Nigeria"} →{" "}
                            {request.destination_country ?? "Destination"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(
                              request.request_status,
                            )}`}
                          >
                            {STATUS_LABELS[request.request_status] ?? request.request_status}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${paymentTone(
                              request.payment_status,
                            )}`}
                          >
                            {paymentStatusLabel(request.payment_status)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium text-muted-foreground">
                        <span>Submitted {formatDate(request.created_at)}</span>
                        <span>Reference {request.request_reference}</span>
                        <span>{request.document_count} document(s)</span>
                        <span>
                          Amount: {formatMoney(request.agreed_fee, "NGN")}
                        </span>
                      </div>
                    </Link>
                    {request.payment_status !== "payment_received" && request.agreed_fee ? (
                      <Button
                        asChild
                        size="sm"
                        className="btn-gradient mt-3 rounded-2xl text-white"
                      >
                        <Link to="/payment/$requestId" params={{ requestId: request.id }}>
                          Pay {formatMoney(request.agreed_fee, "NGN")}
                        </Link>
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-card rounded-3xl p-6 md:p-8">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy">
              <Bell className="h-5 w-5" aria-hidden="true" />
              Updates
            </h2>
            <Button asChild variant="ghost" size="sm" className="mt-2 h-auto p-0 text-navy-soft">
              <Link to="/dashboard/notifications">Open notification centre</Link>
            </Button>
            {data.notifications.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You are all caught up. We will notify you here whenever a request moves forward or a
                document is needed.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {data.notifications.slice(0, 6).map((note) => (
                  <li
                    key={note.id}
                    className={`rounded-2xl border p-4 ${
                      note.read_status
                        ? "border-border bg-white/60"
                        : "border-lavender/50 bg-lavender-tint"
                    }`}
                  >
                    <p className="text-sm font-bold text-navy">{note.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{note.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(note.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </AccountShell>
  );
}
