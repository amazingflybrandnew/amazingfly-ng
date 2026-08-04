import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileWarning,
  Loader2,
  XCircle,
} from "lucide-react";

import { AdminShell, PRIORITY_LABELS, priorityTone, useAdminSession } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addRequestNote,
  assignRequestStaff,
  getAdminDocumentUrl,
  getAdminRequestDetail,
  requestDocumentFromCustomer,
  reviewUploadedDocument,
  setRequestPriority,
  setRequestQuotation,
  updateRequestStatus,
} from "@/lib/admin.functions";
import { REQUEST_STATUSES, STATUS_LABELS, formatDate, statusTone } from "@/lib/request-status";
import {
  ADMIN_STAGE_LABELS,
  PAYMENT_REQUIRED_MESSAGE,
  adminStageTone,
  deriveAdminStage,
  isPaid,
} from "@/lib/admin-workflow";
import { findCatalogueItem } from "@/lib/catalogue/visa-catalogue";

import { getRequestMessages, sendAdminMessage } from "@/lib/admin-ops.functions";
import { getRequestPaymentTransactions } from "@/lib/payment/transactions.functions";
import {
  paymentTypeLabel,
  transactionStatusLabel,
  transactionTone,
} from "@/lib/payment/types";
import { formatMoney, paymentStatusLabel, paymentTone } from "@/lib/payment-status";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/booking/booking-status";



export const Route = createFileRoute("/admin/requests/$id")({
  head: () => ({
    meta: [
      { title: "Application Detail | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Authorised staff view of a single Amazingfly Travels application: customer details, travel information, documents and status history.",
      },
      { property: "og:title", content: "Application Detail | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "Manage one Amazingfly Travels customer application end to end.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRequestDetailPage,
});

/** Common follow-up documents staff request, with ready-made instructions. */
const DOCUMENT_PRESETS: { name: string; description: string }[] = [
  {
    name: "Bank statement (6 months)",
    description:
      "Official 6-month statement, stamped by your bank, showing your name and account number.",
  },
  {
    name: "Employment letter",
    description: "Letter from your employer on company letterhead confirming your role and leave.",
  },
  {
    name: "Passport data page",
    description: "Clear colour scan of the data page, valid for at least 6 more months.",
  },
  {
    name: "Passport photograph",
    description: "Recent photograph on a plain background, taken within the last 6 months.",
  },
  {
    name: "Travel itinerary",
    description: "Your intended travel dates, destinations and accommodation details.",
  },
  {
    name: "Invitation letter",
    description: "Signed invitation from your host, with their contact details and address.",
  },
];


function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">{label}</p>
      <p className="mt-1 break-words text-sm text-navy">{value || "—"}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-3xl p-6">
      <h2 className="text-lg font-extrabold text-navy">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AdminRequestDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: session } = useAdminSession();
  const actions = session?.admin?.actions ?? [];
  const allow = (action: string) => actions.includes(action as never);

  const fetchDetail = useServerFn(getAdminRequestDetail);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "request", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  const fetchPayments = useServerFn(getRequestPaymentTransactions);
  const payments = useQuery({
    queryKey: ["admin", "request", id, "payments"],
    queryFn: () => fetchPayments({ data: { request_id: id } }),
  });
  const paymentRows = payments.data ?? [];



  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  const statusFn = useServerFn(updateRequestStatus);
  const assignFn = useServerFn(assignRequestStaff);
  const priorityFn = useServerFn(setRequestPriority);
  const noteFn = useServerFn(addRequestNote);
  const docRequestFn = useServerFn(requestDocumentFromCustomer);
  const reviewFn = useServerFn(reviewUploadedDocument);
  const downloadFn = useServerFn(getAdminDocumentUrl);

  const [statusValue, setStatusValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [note, setNote] = useState("");
  const [docName, setDocName] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");


  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    fn().then(async (result) => {
      setFeedback(result.ok ? null : (result.message ?? "That did not work."));
      if (result.ok) await refresh();
      return result;
    });

  const quoteFn = useServerFn(setRequestQuotation);
  const quoteMutation = useMutation({
    mutationFn: () =>
      run(() =>
        quoteFn({
          data: {
            request_id: id,
            amount: Number(quoteAmount),
            currency: "NGN",
            note: quoteNote,
          },
        }),
      ),
    onSuccess: () => {
      setQuoteAmount("");
      setQuoteNote("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      run(() =>
        statusFn({
          data: { request_id: id, status: statusValue, message: statusMessage },
        }),
      ),
    onSuccess: () => setStatusMessage(""),
  });

  /** One-click workflow actions: start processing, complete, cancel. */
  const quickStatus = useMutation({
    mutationFn: (input: { status: string; message: string }) =>
      run(() =>
        statusFn({ data: { request_id: id, status: input.status, message: input.message } }),
      ),
  });



  const noteMutation = useMutation({
    mutationFn: () => run(() => noteFn({ data: { request_id: id, note } })),
    onSuccess: () => setNote(""),
  });

  const docRequestMutation = useMutation({
    mutationFn: () =>
      run(() =>
        docRequestFn({
          data: {
            request_id: id,
            document_name: docName,
            description: docDescription,
            required_status: "required",
          },
        }),
      ),
    onSuccess: () => {
      setDocName("");
      setDocDescription("");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (input: { document_id: string; review_status: "approved" | "rejected" }) =>
      run(() => reviewFn({ data: { ...input, review_note: "" } })),
  });

  const openDocument = async (documentId: string) => {
    const result = await downloadFn({ data: { document_id: documentId } });
    if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
    else setFeedback(result.message);
  };

  if (isPending) {
    return (
      <AdminShell title="Application">
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell title="Application not found">
        <div className="glass-card rounded-3xl p-8">
          <p className="text-sm text-muted-foreground">
            We could not load this application. It may have been removed.
          </p>
          <Button asChild variant="ghost" className="mt-4 text-navy-soft">
            <Link to="/admin/requests">Back to requests</Link>
          </Button>
        </div>
      </AdminShell>
    );
  }

  const { request, documents, documentRequests, notes, activity, staff } = data;
  const missing = documentRequests.filter(
    (item) => item.uploaded_status === "pending" || item.uploaded_status === "rejected",
  );
  const currentStatus = statusValue || request.request_status;
  const stage = deriveAdminStage(request);
  const paid = isPaid(request.payment_status);
  const amountDue = request.payment_amount ?? 0;
  const canProcess = paid || amountDue <= 0;
  const catalogueItem = findCatalogueItem(request.catalogue_id);


  return (
    <AdminShell
      title={request.request_reference}
      subtitle={`${request.full_name} · ${request.service_type || request.service_category || "Travel service"}`}
      actions={
        <Button asChild variant="ghost" className="text-navy-soft">
          <Link to="/admin/requests">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            All requests
          </Link>
        </Button>
      }
    >
      {feedback ? (
        <div className="mb-6 rounded-2xl border border-coral/50 bg-peach-tint px-4 py-3 text-sm font-medium text-navy">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Customer information">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" value={request.full_name} />
              <Field label="Email" value={request.email} />
              <Field label="Phone" value={request.phone} />
              <Field label="WhatsApp" value={request.whatsapp} />
              <Field label="Nationality" value={request.nationality} />
              <Field label="Country of residence" value={request.country_of_residence} />
              <Field label="Preferred contact" value={request.preferred_contact} />
              <Field label="Submitted" value={formatDate(request.created_at)} />
            </div>
          </Panel>

          <Panel title="Service & travel information">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Origin" value={request.origin_country} />
              <Field label="Destination" value={request.destination_country} />
              <Field
                label="Service type"
                value={request.service_type || request.service_category}
              />
              <Field label="Service selected" value={catalogueItem?.name ?? "—"} />
              <Field
                label="Expected processing time"
                value={catalogueItem?.processingTime ?? "Confirmed by our specialists"}
              />
              <Field label="Purpose" value={request.travel_purpose} />
              <Field label="Travel date" value={formatDate(request.travel_date)} />
              <Field label="Return date" value={formatDate(request.return_date)} />
            </div>

            {request.request_details ? (
              <p className="mt-5 whitespace-pre-line rounded-2xl bg-white/70 p-4 text-sm leading-relaxed text-navy-soft">
                {request.request_details}
              </p>
            ) : null}
            {request.answers.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {request.answers.map((answer) => (
                  <Field key={answer.label} label={answer.label} value={answer.value} />
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Payment"
            description="Payment and booking status are set automatically by the payment system — they cannot be changed manually."
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${paymentTone(
                  request.payment_status,
                )}`}
              >
                Payment: {paymentStatusLabel(request.payment_status)}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${bookingStatusTone(
                  request.booking_status,
                )}`}
              >
                Booking: {bookingStatusLabel(request.booking_status)}
              </span>
            </div>

            <div className="mb-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Amount"
                value={
                  amountDue > 0
                    ? formatMoney(amountDue, request.payment_currency ?? "NGN")
                    : request.requires_quote
                      ? "Awaiting quotation"
                      : "—"
                }
              />
              <Field label="Transaction reference" value={request.payment_reference ?? "—"} />
              <Field
                label="Payment date"
                value={request.payment_date ? formatDate(request.payment_date) : "—"}
              />
              <Field label="Documents uploaded" value={String(request.document_count)} />
            </div>



            {paymentRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payment transaction has been prepared for this request yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {paymentRows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/70 p-4"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-navy-soft">
                        {row.transaction_reference}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {paymentTypeLabel(row.payment_type)} · {formatDate(row.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-navy">
                        {formatMoney(row.amount, row.currency)}
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${transactionTone(
                          row.status,
                        )}`}
                      >
                        {transactionStatusLabel(row.status)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>



          <Panel
            title="Documents"
            description="Files the customer uploaded, plus anything still outstanding."
          >
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-navy">{doc.document_type}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doc.file_name} · {formatDate(doc.uploaded_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          doc.review_status === "approved"
                            ? "border-mint/50 bg-mint-tint text-navy"
                            : doc.review_status === "rejected"
                              ? "border-coral/50 bg-peach-tint text-navy"
                              : "border-sky/50 bg-sky-tint text-navy"
                        }`}
                      >
                        {doc.review_status === "approved"
                          ? "Approved"
                          : doc.review_status === "rejected"
                            ? "Rejected"
                            : "Pending review"}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-navy-soft"
                        onClick={() => openDocument(doc.id)}
                      >
                        <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-navy-soft"
                        onClick={() => openDocument(doc.id)}
                      >
                        <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Download
                      </Button>
                      {allow("review_document") ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="btn-gradient text-white"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                document_id: doc.id,
                                review_status: "approved",
                              })
                            }
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                document_id: doc.id,
                                review_status: "rejected",
                              })
                            }
                          >
                            <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 rounded-2xl border border-orange/30 bg-peach-tint p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-navy">
                <FileWarning className="h-4 w-4" aria-hidden="true" />
                Missing documents ({missing.length})
              </p>
              {missing.length === 0 ? (
                <p className="mt-2 text-sm text-navy-soft">Nothing outstanding.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {missing.map((item) => (
                    <li key={item.id} className="text-sm text-navy">
                      <span className="font-semibold">{item.document_name}</span>
                      {item.description ? (
                        <span className="text-navy-soft"> — {item.description}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {allow("request_document") ? (
              <form
                className="mt-5 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (docName.trim().length > 1) docRequestMutation.mutate();
                }}
              >
                <div className="flex flex-wrap gap-2">
                  {DOCUMENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setDocName(preset.name);
                        setDocDescription(preset.description);
                      }}
                      className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-bold text-navy-soft transition-colors hover:bg-white hover:text-navy"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <Input
                  value={docName}
                  onChange={(event) => setDocName(event.target.value)}
                  placeholder="Document name, e.g. Bank statement (6 months)"
                  aria-label="Document name"
                  className="rounded-2xl border-white/60 bg-white/80"
                />
                <Textarea
                  value={docDescription}
                  onChange={(event) => setDocDescription(event.target.value)}
                  placeholder="Instructions for the customer (optional)"
                  aria-label="Document instructions"
                  className="rounded-2xl border-white/60 bg-white/80"
                  rows={2}
                />

                <Button
                  type="submit"
                  className="btn-gradient text-white"
                  disabled={docRequestMutation.isPending || docName.trim().length < 2}
                >
                  {docRequestMutation.isPending ? "Requesting…" : "Request document"}
                </Button>
              </form>
            ) : null}
          </Panel>
        </div>

        <div className="space-y-6">
          {allow("manage_payments") && request.requires_quote ? (
            <Panel title="Personalised quotation">
              <p className="text-sm text-navy-soft">
                This service needs specialist pricing. Saving a quotation makes the payment button
                available to the customer and notifies them by email.
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  quoteMutation.mutate();
                }}
              >
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                  Quoted amount (NGN)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quoteAmount}
                  onChange={(event) => setQuoteAmount(event.target.value)}
                  placeholder="e.g. 3300000"
                  className="w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-navy"
                />
                <Textarea
                  value={quoteNote}
                  onChange={(event) => setQuoteNote(event.target.value)}
                  placeholder="Quote notes shared with the customer (optional)"
                  aria-label="Quote notes"
                  rows={3}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
                <Button
                  type="submit"
                  className="btn-gradient w-full text-white"
                  disabled={quoteMutation.isPending || !(Number(quoteAmount) > 0)}
                >
                  {quoteMutation.isPending ? "Saving…" : "Save quotation"}
                </Button>
              </form>
            </Panel>
          ) : null}

          {allow("update_status") ? (
            <Panel
              title="Processing actions"
              description="Move this application through the workflow. Every action is logged and the customer is notified."
            >
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${adminStageTone(stage)}`}
              >
                {ADMIN_STAGE_LABELS[stage]}
              </span>

              {!canProcess ? (
                <p className="mt-4 rounded-2xl border border-orange/40 bg-peach-tint px-4 py-3 text-sm font-semibold text-navy">
                  {PAYMENT_REQUIRED_MESSAGE}
                </p>
              ) : null}

              <div className="mt-4 space-y-2.5">
                <Button
                  type="button"
                  className="btn-gradient w-full text-white"
                  disabled={quickStatus.isPending || !canProcess || stage === "processing"}
                  onClick={() =>
                    quickStatus.mutate({
                      status: "processing",
                      message: "Your application is now being processed by our team.",
                    })
                  }
                >
                  <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Start processing
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={quickStatus.isPending}
                  onClick={() =>
                    quickStatus.mutate({
                      status: "additional_documents_required",
                      message:
                        "Additional documents are required before we can continue your application.",
                    })
                  }
                >
                  <FileWarning className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Mark additional documents required
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={quickStatus.isPending || !canProcess || stage === "completed"}
                  onClick={() =>
                    quickStatus.mutate({
                      status: "completed",
                      message: "Your request has been completed.",
                    })
                  }
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Mark completed
                </Button>
              </div>

              <div className="mt-5 space-y-2.5 rounded-2xl border border-white/70 bg-white/60 p-4">
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                  Cancel request
                </label>
                <Textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Reason shared with the customer"
                  aria-label="Cancellation reason"
                  rows={2}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-coral/50 text-navy"
                  disabled={
                    quickStatus.isPending ||
                    stage === "cancelled" ||
                    cancelReason.trim().length < 3
                  }
                  onClick={() => {
                    quickStatus.mutate({ status: "cancelled", message: cancelReason.trim() });
                    setCancelReason("");
                  }}
                >
                  <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Cancel request
                </Button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Requesting additional documents from the Documents panel also notifies the customer
                by email.
              </p>
            </Panel>
          ) : null}

          <Panel title="Status">

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(request.request_status)}`}
              >
                {STATUS_LABELS[request.request_status] ?? request.request_status}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${priorityTone(request.priority)}`}
              >
                {PRIORITY_LABELS[request.priority] ?? request.priority} priority
              </span>
            </div>

            {allow("update_status") ? (
              <form
                className="mt-5 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  statusMutation.mutate();
                }}
              >
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                  Change status
                </label>
                <select
                  value={currentStatus}
                  onChange={(event) => setStatusValue(event.target.value)}
                  className="w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-navy"
                >
                  {REQUEST_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value] ?? value}
                    </option>
                  ))}
                </select>
                <Textarea
                  value={statusMessage}
                  onChange={(event) => setStatusMessage(event.target.value)}
                  placeholder="Message saved to the customer timeline (optional)"
                  aria-label="Status message"
                  rows={2}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
                <Button
                  type="submit"
                  className="btn-gradient w-full text-white"
                  disabled={statusMutation.isPending || currentStatus === request.request_status}
                >
                  {statusMutation.isPending ? "Updating…" : "Update status"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Updating notifies the customer and saves an activity entry.
                </p>
              </form>
            ) : null}

            {allow("set_priority") ? (
              <div className="mt-5">
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                  Priority
                </label>
                <select
                  value={request.priority}
                  onChange={(event) =>
                    run(() =>
                      priorityFn({
                        data: {
                          request_id: id,
                          priority: event.target.value as "low" | "normal" | "high" | "urgent",
                        },
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-navy"
                >
                  {(["low", "normal", "high", "urgent"] as const).map((value) => (
                    <option key={value} value={value}>
                      {PRIORITY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {allow("assign_staff") ? (
              <div className="mt-5">
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-navy-soft">
                  Assigned staff
                </label>
                <select
                  value={request.assigned_staff_id ?? ""}
                  onChange={(event) =>
                    run(() =>
                      assignFn({
                        data: { request_id: id, staff_id: event.target.value || null },
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-navy"
                >
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </Panel>

          <Panel title="Activity history">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status changes yet.</p>
            ) : (
              <ol className="space-y-4">
                {activity.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-lavender/60 pl-4">
                    <p className="text-sm font-semibold text-navy">
                      {STATUS_LABELS[entry.status ?? ""] ?? entry.status ?? "Update"}
                    </p>
                    {entry.message ? (
                      <p className="mt-0.5 text-sm text-navy-soft">{entry.message}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Internal notes" description="Only visible to Amazingfly Travels staff.">
            {allow("write_note") ? (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (note.trim().length > 1) noteMutation.mutate();
                }}
              >
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add an internal note"
                  aria-label="Internal note"
                  rows={3}
                  className="rounded-2xl border-white/60 bg-white/80"
                />
                <Button
                  type="submit"
                  className="btn-gradient text-white"
                  disabled={noteMutation.isPending || note.trim().length < 2}
                >
                  {noteMutation.isPending ? "Saving…" : "Save note"}
                </Button>
              </form>
            ) : null}

            <ul className="mt-5 space-y-3">
              {notes.map((item) => (
                <li key={item.id} className="rounded-2xl bg-white/70 p-4">
                  <p className="whitespace-pre-line text-sm text-navy">{item.note}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {item.author} · {formatDate(item.created_at)}
                  </p>
                </li>
              ))}
              {notes.length === 0 ? (
                <li className="text-sm text-muted-foreground">No internal notes yet.</li>
              ) : null}
            </ul>
          </Panel>

          {allow("message_customer") && request.email ? (
            <RequestMessages requestId={id} email={request.email} />
          ) : null}

        </div>
      </div>
    </AdminShell>
  );
}

/** Customer-facing conversation attached to this application. */
function RequestMessages({ requestId, email }: { requestId: string; email: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const fetchMessages = useServerFn(getRequestMessages);
  const sendFn = useServerFn(sendAdminMessage);

  const messages = useQuery({
    queryKey: ["admin", "request-messages", requestId],
    queryFn: () => fetchMessages({ data: { request_id: requestId } }),
  });

  const send = useMutation({
    mutationFn: () => sendFn({ data: { email, request_id: requestId, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "request-messages", requestId] });
    },
  });

  const list = messages.data ?? [];

  return (
    <Panel
      title="Messages to the customer"
      description="The customer sees these inside their Amazingfly account and gets a notification."
    >
      <ul className="space-y-3">
        {list.length === 0 ? (
          <li className="text-sm text-muted-foreground">No messages yet.</li>
        ) : (
          list.map((message) => (
            <li
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                message.sender === "admin"
                  ? "ml-auto bg-navy text-white"
                  : "border border-white/70 bg-white/80 text-navy"
              }`}
            >
              <p className="whitespace-pre-line">{message.body}</p>
              <p
                className={`mt-1.5 text-[11px] ${
                  message.sender === "admin" ? "text-white/70" : "text-muted-foreground"
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
          if (body.trim().length > 1) send.mutate();
        }}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="Write a message to the customer"
          aria-label="Message to customer"
          className="rounded-2xl border-white/60 bg-white/80"
        />
        <Button
          type="submit"
          className="btn-gradient text-white"
          disabled={send.isPending || body.trim().length < 2}
        >
          {send.isPending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </Panel>
  );
}
