import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { DocumentList } from "@/components/DocumentList";
import { DocumentRequestList } from "@/components/DocumentRequestList";

import { RequestTimeline } from "@/components/RequestTimeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getRequestConversation,
  getRequestDetail,
  replyToAmazingfly,
} from "@/lib/account.functions";
import { STATUS_LABELS, formatDate } from "@/lib/request-status";
import { formatMoney } from "@/lib/payment-status";
import type { AccountRequest } from "@/lib/account.functions";
import { LONG_STAY_QUOTE_MESSAGE, PROCESSING_FAQ } from "@/lib/catalogue/visa-catalogue";
import { ensureServicePayment } from "@/lib/payment/service-payment.functions";
import { WORKFLOW_LABELS, deriveWorkflowStatus, workflowTone } from "@/lib/workflow-status";

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
                className={`rounded-full border px-4 py-1.5 text-xs font-bold ${workflowTone(
                  deriveWorkflowStatus(data.request),
                )}`}
              >
                {WORKFLOW_LABELS[deriveWorkflowStatus(data.request)]}
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

            <PaymentPanel request={data.request} documentCount={data.documents.length} />

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

/** Two-way conversation between the customer and Amazingfly Travels staff. */
function RequestConversation({ requestId }: { requestId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const fetchConversation = useServerFn(getRequestConversation);
  const replyFn = useServerFn(replyToAmazingfly);

  const conversation = useQuery({
    queryKey: ["account", "conversation", requestId],
    queryFn: () => fetchConversation({ data: { id: requestId } }),
  });

  const reply = useMutation({
    mutationFn: () => replyFn({ data: { id: requestId, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["account", "conversation", requestId] });
    },
  });

  const messages = conversation.data ?? [];

  return (
    <section className="glass-card rounded-3xl p-6 md:p-8">
      <h2 className="mb-2 text-xl font-extrabold text-navy">Messages</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Talk directly to the Amazingfly Travels specialist handling this request.
      </p>

      <ul className="space-y-3">
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">No messages yet.</li>
        ) : (
          messages.map((message) => (
            <li
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                message.sender === "customer"
                  ? "ml-auto bg-navy text-white"
                  : "border border-white/70 bg-white/80 text-navy"
              }`}
            >
              <p className="whitespace-pre-line">{message.body}</p>
              <p
                className={`mt-1.5 text-[11px] ${
                  message.sender === "customer" ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                {message.author} · {formatDate(message.created_at)}
              </p>
            </li>
          ))
        )}
      </ul>

      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim().length > 1) reply.mutate();
        }}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="Write a message to our team"
          aria-label="Message to Amazingfly Travels"
          className="rounded-2xl border-white/60 bg-white/80"
        />
        <Button
          type="submit"
          className="btn-gradient text-white"
          disabled={reply.isPending || body.trim().length < 2}
        >
          {reply.isPending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </section>
  );
}

/** Universal payment call-to-action: available as soon as the application is
 * complete and documents are uploaded, unless the service needs a quotation. */
function PaymentPanel({
  request,
  documentCount,
}: {
  request: AccountRequest;
  documentCount: number;
}) {
  const status = deriveWorkflowStatus({ ...request, document_count: documentCount });
  if (status === "cancelled") return null;

  if (status === "quotation_pending") {
    return (
      <div className="mt-6 rounded-2xl border border-coral/30 bg-peach-tint p-5">
        <p className="text-sm font-bold text-navy">Personalised quotation</p>
        <p className="mt-1 text-sm leading-relaxed text-navy-soft">{LONG_STAY_QUOTE_MESSAGE}</p>
      </div>
    );
  }

  const amount = request.amount ?? request.agreed_fee;
  const paid = status === "payment_successful" || status === "processing" || status === "completed";

  // As soon as the application is complete the pending transaction is created,
  // so the customer always sees a payment reference next to the Pay now button.
  const ensureFn = useServerFn(ensureServicePayment);
  const payment = useQuery({
    queryKey: ["service-payment", request.id],
    queryFn: () => ensureFn({ data: { request_id: request.id } }),
    enabled: !paid && Boolean(amount && amount > 0),
    staleTime: 60_000,
  });

  if (paid) {
    const paidLabel = request.paid_amount
      ? formatMoney(request.paid_amount, request.paid_currency ?? "NGN")
      : amount
        ? formatMoney(amount, request.currency ?? "NGN")
        : "";
    return (
      <div className="mt-6 rounded-2xl border border-mint/50 bg-mint-tint p-5">
        <p className="text-sm font-bold text-navy">
          Payment received{paidLabel ? ` — ${paidLabel}` : ""}
        </p>
        <p className="mt-1 text-sm text-navy-soft">
          Amazingfly Travels has started processing your request. We will update this page as
          processing progresses.
        </p>
        {request.transaction_reference ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Transaction reference: {request.transaction_reference}
          </p>
        ) : null}
      </div>
    );
  }

  if (!amount) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange/40 bg-peach-tint p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Amount payable
        </p>
        <p className="mt-1 text-2xl font-extrabold text-navy">
          {formatMoney(amount, request.currency ?? "NGN")}
        </p>
        <p className="mt-1 text-sm text-navy-soft">
          {documentCount === 0
            ? "Upload your documents below — you can still pay now and add them afterwards."
            : "Documents received successfully. Your application fee is ready. Complete payment to begin processing."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {request.service_type ?? "Travel service"}
          {payment.data && payment.data.ok
            ? ` · Payment reference ${payment.data.reference}`
            : ""}
        </p>
      </div>
      <Button asChild size="lg" className="btn-gradient rounded-2xl text-white">
        <Link to="/checkout/$requestId" params={{ requestId: request.id }}>
          Pay now
        </Link>
      </Button>
    </div>
  );
}
