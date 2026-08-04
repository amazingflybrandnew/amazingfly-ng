/**
 * Business automation for Amazingfly Travels (Stage 6 Part 3).
 *
 * One place composes every automated customer email, writes it to the
 * `email_notifications` audit table and mirrors it into the in-app
 * notification centre. Delivery is intentionally pluggable: until the
 * Amazingfly.ng sender domain is verified, messages are composed and logged
 * so the workflow and admin visibility already work end to end. When the
 * sender domain is live, swap `deliver()` for the project email helper -
 * nothing else in the codebase changes.
 *
 * Server-only. Never throws: an automation problem must never fail a
 * customer submission, a status change or a payment.
 */

export type AutomationEvent =
  | "account_created"
  | "request_submitted"
  | "admin_new_request"
  | "status_update"
  | "document_request"
  | "payment_confirmed"
  | "admin_payment_received"
  | "quotation_ready"
  | "request_completed";

export type ComposedEmail = {
  to: string;
  subject: string;
  body: string;
  kind: AutomationEvent;
};

export type RequestNotificationContext = {
  reference: string;
  fullName: string;
  email: string;
  serviceLabel: string;
  originCountry: string;
  destinationCountry: string;
  travelDate: string | null;
  documentCount: number;
};

const ADMIN_RECIPIENT = process.env["ADMIN_NOTIFICATION_EMAIL"] ?? "info@amazingfly.ng";
const SIGN_OFF = ["", "Amazingfly Travels - Amazingfly.ng", ""].join("\n");

const lines = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join("\n");

const greeting = (name: string) => `Hello ${name || "there"},`;

async function db() {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  return createExternalSupabaseAdmin();
}

// ----------------------------------------------------------------- templates

export function composeWelcome(input: { fullName: string; email: string }): ComposedEmail {
  return {
    to: input.email,
    kind: "account_created",
    subject: "Welcome to Amazingfly Travels",
    body: lines(
      greeting(input.fullName),
      "",
      "Welcome to Amazingfly Travels. Your account on Amazingfly.ng is ready.",
      "",
      "From your dashboard you can start a travel request, upload documents, follow live progress and message our travel specialists at any time.",
      "",
      "Sign in any time at Amazingfly.ng/dashboard.",
      SIGN_OFF,
    ),
  };
}

export function composeCustomerReceipt(ctx: RequestNotificationContext): ComposedEmail {
  return {
    to: ctx.email,
    kind: "request_submitted",
    subject: `We received your travel request ${ctx.reference}`,
    body: lines(
      greeting(ctx.fullName),
      "",
      "Thank you for choosing Amazingfly Travels. We have received your travel request.",
      "",
      `Reference: ${ctx.reference}`,
      `Service: ${ctx.serviceLabel}`,
      `Route: ${ctx.originCountry} to ${ctx.destinationCountry}`,
      ctx.travelDate ? `Intended travel date: ${ctx.travelDate}` : "",
      `Documents uploaded: ${ctx.documentCount}`,
      "",
      "Our travel specialists will review your request and contact you shortly through your preferred contact method.",
      SIGN_OFF,
    ),
  };
}

export function composeAdminAlert(ctx: RequestNotificationContext): ComposedEmail {
  return {
    to: ADMIN_RECIPIENT,
    kind: "admin_new_request",
    subject: `New travel request ${ctx.reference} - ${ctx.serviceLabel}`,
    body: lines(
      "A new travel request has been submitted on Amazingfly.ng.",
      "",
      `Reference: ${ctx.reference}`,
      `Customer: ${ctx.fullName} <${ctx.email}>`,
      `Service: ${ctx.serviceLabel}`,
      `Route: ${ctx.originCountry} to ${ctx.destinationCountry}`,
      `Documents uploaded: ${ctx.documentCount}`,
    ),
  };
}

export function composeStatusUpdate(
  ctx: { reference: string; fullName: string; email: string },
  status: string,
  note?: string,
): ComposedEmail {
  const label = STATUS_COPY[status] ?? { subject: "Update on your travel request", line: status };
  return {
    to: ctx.email,
    kind: "status_update",
    subject: `${label.subject} (${ctx.reference})`,
    body: lines(
      greeting(ctx.fullName),
      "",
      label.line,
      "",
      `Reference: ${ctx.reference}`,
      note ? `Note from our team: ${note}` : "",
      "",
      "You can follow every step on Amazingfly.ng/dashboard or track it at Amazingfly.ng/track.",
      SIGN_OFF,
    ),
  };
}

const STATUS_COPY: Record<string, { subject: string; line: string }> = {
  new_request: {
    subject: "Your travel request has been received",
    line: "Your travel request has been received and is queued for review.",
  },
  under_review: {
    subject: "Your application is now under review",
    line: "Good news - your application is now under review by our travel specialists.",
  },
  documents_required: {
    subject: "Additional documents required",
    line: "We need a few additional documents before we can continue with your application.",
  },
  additional_documents_required: {
    subject: "Additional documents are required",
    line: "Additional documents are required to continue processing your request.",
  },

  processing: {
    subject: "Your application is now processing",
    line: "Your application is now being processed by our team.",
  },
  approved: {
    subject: "Your application has been approved",
    line: "Your application has moved to the approved stage.",
  },
  completed: {
    subject: "Your request has been completed",
    line: "Your request has been completed. Everything is ready for your trip.",
  },
  cancelled: {
    subject: "Your travel request has been cancelled",
    line: "Your travel request has been cancelled. Reply to this email if this was unexpected.",
  },
};

export function composeDocumentRequest(ctx: {
  reference: string;
  fullName: string;
  email: string;
  documentName: string;
  description?: string | null;
  requiredStatus?: string;
}): ComposedEmail {
  return {
    to: ctx.email,
    kind: "document_request",
    subject: `Additional documents required (${ctx.reference})`,
    body: lines(
      greeting(ctx.fullName),
      "",
      "To continue with your application we need an additional document.",
      "",
      `Reference: ${ctx.reference}`,
      `Document: ${ctx.documentName}${ctx.requiredStatus === "optional" ? " (optional)" : ""}`,
      ctx.description ? `Details: ${ctx.description}` : "",
      "",
      "You can upload it securely from Amazingfly.ng/dashboard under Documents required.",
      SIGN_OFF,
    ),
  };
}

export function composePaymentConfirmation(ctx: {
  reference: string;
  fullName: string;
  email: string;
  amountLabel: string;
  transactionReference?: string;
}): ComposedEmail {
  return {
    to: ctx.email,
    kind: "payment_confirmed",
    subject: `Payment received successfully (${ctx.reference})`,
    body: lines(
      greeting(ctx.fullName),
      "",
      "We have received your payment. Thank you.",
      "",
      `Reference: ${ctx.reference}`,
      `Amount: ${ctx.amountLabel}`,
      ctx.transactionReference ? `Transaction: ${ctx.transactionReference}` : "",
      "",
      "Your application continues with our travel specialists and you will be notified at every step.",
      SIGN_OFF,
    ),
  };
}

export function composeCompletion(ctx: {
  reference: string;
  fullName: string;
  email: string;
  serviceLabel?: string;
}): ComposedEmail {
  return {
    to: ctx.email,
    kind: "request_completed",
    subject: `Your request has been completed (${ctx.reference})`,
    body: lines(
      greeting(ctx.fullName),
      "",
      "Your request has been completed by the Amazingfly Travels team.",
      "",
      `Reference: ${ctx.reference}`,
      ctx.serviceLabel ? `Service: ${ctx.serviceLabel}` : "",
      "",
      "Sign in at Amazingfly.ng/dashboard to download your documents. We would love to help with your next journey.",
      SIGN_OFF,
    ),
  };
}

// ------------------------------------------------------------------ delivery

async function deliver(message: ComposedEmail) {
  // TODO: replace with the project email sender once the Amazingfly.ng
  // sender domain is verified. Until then every automated message is composed
  // and logged so operations keeps full visibility.
  console.info("[automation]", message.kind, "->", message.to, "|", message.subject);
}

async function logEmail(
  message: ComposedEmail,
  meta: { requestId?: string | null; userId?: string | null; reference?: string | null },
) {
  try {
    const supabase = await db();
    await supabase.from("email_notifications").insert({
      event_type: message.kind,
      recipient_email: message.to,
      subject: message.subject,
      body: message.body,
      request_id: meta.requestId ?? null,
      user_id: meta.userId ?? null,
      request_reference: meta.reference ?? null,
      delivery_status: "logged",
    });
  } catch (error) {
    console.error("[automation] email log failed", error);
  }
}

/** Mirrors an automated email into the customer notification centre. */
async function pushInApp(input: {
  userId?: string | null;
  title: string;
  message: string;
  requestId?: string | null;
}) {
  if (!input.userId) return;
  try {
    const supabase = await db();
    const payload: Record<string, unknown> = {
      user_id: input.userId,
      title: input.title,
      message: input.message,
      read_status: false,
    };
    const withRequest = await supabase
      .from("notifications")
      .insert({ ...payload, request_id: input.requestId ?? null });
    if (withRequest.error) await supabase.from("notifications").insert(payload);
  } catch (error) {
    console.error("[automation] in-app notification failed", error);
  }
}

/** Composes, logs, delivers and mirrors one automated message. */
export async function sendAutomated(
  message: ComposedEmail,
  meta: {
    requestId?: string | null;
    userId?: string | null;
    reference?: string | null;
    inApp?: { title: string; message: string } | false;
  } = {},
): Promise<void> {
  try {
    await deliver(message);
    await logEmail(message, meta);
    if (meta.inApp !== false && meta.inApp) {
      await pushInApp({
        userId: meta.userId ?? null,
        title: meta.inApp.title,
        message: meta.inApp.message,
        requestId: meta.requestId ?? null,
      });
    }
  } catch (error) {
    console.error("[automation] failed", error);
  }
}

/** Finds the customer behind a request so automation can address them. */
export async function requestRecipient(requestId: string): Promise<{
  id: string;
  reference: string;
  fullName: string;
  email: string;
  userId: string | null;
  serviceLabel: string;
} | null> {
  try {
    const supabase = await db();
    const { data } = await supabase
      .from("service_requests")
      .select("id, request_reference, full_name, email, user_id, service_type, service_category")
      .eq("id", requestId)
      .maybeSingle();
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: String(row["id"]),
      reference: String(row["request_reference"] ?? ""),
      fullName: String(row["full_name"] ?? ""),
      email: String(row["email"] ?? ""),
      userId: row["user_id"] ? String(row["user_id"]) : null,
      serviceLabel: String(row["service_type"] ?? row["service_category"] ?? "Travel service"),
    };
  } catch (error) {
    console.error("[automation] recipient lookup failed", error);
    return null;
  }
}

// ------------------------------------------------------------- public events

export async function notifyAccountCreated(input: {
  userId: string | null;
  fullName: string;
  email: string;
}) {
  await sendAutomated(composeWelcome(input), {
    userId: input.userId,
    inApp: {
      title: "Welcome to Amazingfly Travels",
      message:
        "Your account is ready. Start a travel request and we will guide you through every step.",
    },
  });
}

export async function notifyRequestReceived(ctx: RequestNotificationContext & { requestId?: string; userId?: string | null }) {
  await Promise.all([
    sendAutomated(composeCustomerReceipt(ctx), {
      requestId: ctx.requestId ?? null,
      userId: ctx.userId ?? null,
      reference: ctx.reference,
      inApp: {
        title: "We received your travel request",
        message: `Request ${ctx.reference} has been received and will be reviewed by our specialists.`,
      },
    }),
    sendAutomated(composeAdminAlert(ctx), {
      requestId: ctx.requestId ?? null,
      reference: ctx.reference,
      inApp: false,
    }),
  ]);
}

export async function notifyStatusChanged(requestId: string, status: string, note?: string) {
  const who = await requestRecipient(requestId);
  if (!who?.email) return;

  if (status === "completed") {
    await sendAutomated(
      composeCompletion({
        reference: who.reference,
        fullName: who.fullName,
        email: who.email,
        serviceLabel: who.serviceLabel,
      }),
      {
        requestId,
        userId: who.userId,
        reference: who.reference,
        inApp: {
          title: "Your request has been completed",
          message: `Request ${who.reference} is complete. Sign in to download your documents.`,
        },
      },
    );
    return;
  }

  const copy = STATUS_COPY[status];
  await sendAutomated(
    composeStatusUpdate(
      { reference: who.reference, fullName: who.fullName, email: who.email },
      status,
      note,
    ),
    {
      requestId,
      userId: who.userId,
      reference: who.reference,
      inApp: {
        title: copy?.subject ?? "Update on your travel request",
        message: `${copy?.line ?? "Your request status has changed."} (${who.reference})`,
      },
    },
  );
}

export async function notifyDocumentRequested(input: {
  requestId: string;
  documentName: string;
  description?: string | null;
  requiredStatus?: string;
}) {
  const who = await requestRecipient(input.requestId);
  if (!who?.email) return;
  await sendAutomated(
    composeDocumentRequest({
      reference: who.reference,
      fullName: who.fullName,
      email: who.email,
      documentName: input.documentName,
      description: input.description ?? null,
      ...(input.requiredStatus ? { requiredStatus: input.requiredStatus } : {}),
    }),
    {
      requestId: input.requestId,
      userId: who.userId,
      reference: who.reference,
      inApp: {
        title: "Additional documents required",
        message: `Please upload "${input.documentName}" for request ${who.reference}.`,
      },
    },
  );
}

export async function notifyPaymentReceived(input: {
  requestId: string;
  amountLabel: string;
  transactionReference?: string;
}) {
  const who = await requestRecipient(input.requestId);
  if (!who?.email) return;
  await sendAutomated(
    composePaymentConfirmation({
      reference: who.reference,
      fullName: who.fullName,
      email: who.email,
      amountLabel: input.amountLabel,
      ...(input.transactionReference ? { transactionReference: input.transactionReference } : {}),
    }),
    {
      requestId: input.requestId,
      userId: who.userId,
      reference: who.reference,
      inApp: {
        title: "Payment received successfully",
        message: `We received ${input.amountLabel} for request ${who.reference}. Thank you.`,
      },
    },
  );
}

/** Tells the operations team a paid request is ready for processing. */
export async function notifyAdminPaidRequest(input: {
  requestId: string;
  amountLabel: string;
  transactionReference?: string;
}) {
  const who = await requestRecipient(input.requestId);
  if (!who) return;
  await sendAutomated(
    {
      to: ADMIN_RECIPIENT,
      kind: "admin_payment_received",
      subject: `Paid request ${who.reference} - ${who.serviceLabel}`,
      body: lines(
        "A paid travel request is ready for processing.",
        "",
        `Reference: ${who.reference}`,
        `Customer: ${who.fullName} <${who.email}>`,
        `Service: ${who.serviceLabel}`,
        `Amount paid: ${input.amountLabel}`,
        ...(input.transactionReference ? [`Transaction: ${input.transactionReference}`] : []),
      ),
    },
    { requestId: input.requestId, reference: who.reference, inApp: false },
  );
}

/** Sent when an admin prices a request that required a personalised quotation. */
export async function notifyQuotationReady(input: {
  requestId: string;
  amountLabel: string;
  note?: string | null;
}) {
  const who = await requestRecipient(input.requestId);
  if (!who?.email) return;
  await sendAutomated(
    {
      to: who.email,
      kind: "quotation_ready",
      subject: `Your quotation for ${who.reference} is ready`,
      body: lines(
        `Dear ${who.fullName},`,
        "",
        `Our travel specialist has reviewed your request (${who.reference}) and prepared your quotation.`,
        "",
        `Service: ${who.serviceLabel}`,
        `Amount payable: ${input.amountLabel}`,
        ...(input.note ? ["", `Specialist note: ${input.note}`] : []),
        "",
        "Sign in to your Amazingfly.ng account to complete payment and begin processing.",
        "",
        "Amazingfly Travels",
      ),
    },
    {
      requestId: input.requestId,
      userId: who.userId,
      reference: who.reference,
      inApp: {
        title: "Your quotation is ready",
        message: `Your quotation for request ${who.reference} is ${input.amountLabel}. You can now complete payment.`,
      },
    },
  );
}
