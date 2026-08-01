/**
 * Notification structure for the travel request system.
 *
 * Server-only. Delivery is intentionally pluggable: until an email sender
 * domain is verified for Amazingfly.ng, messages are composed and logged so
 * the workflow (and admin visibility) is in place. Once the sender domain is
 * live, swap `deliver()` for the project email helper - nothing else changes.
 */

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

export type ComposedEmail = {
  to: string;
  subject: string;
  body: string;
  kind: "customer_request_received" | "admin_new_request" | "customer_status_update";
};

const ADMIN_RECIPIENT = process.env["ADMIN_NOTIFICATION_EMAIL"] ?? "info@amazingfly.ng";

export function composeCustomerReceipt(ctx: RequestNotificationContext): ComposedEmail {
  return {
    to: ctx.email,
    kind: "customer_request_received",
    subject: `Your travel request ${ctx.reference} has been received`,
    body: [
      `Hello ${ctx.fullName},`,
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
      "",
      "Amazingfly Travels - Amazingfly.ng",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function composeAdminAlert(ctx: RequestNotificationContext): ComposedEmail {
  return {
    to: ADMIN_RECIPIENT,
    kind: "admin_new_request",
    subject: `New travel request ${ctx.reference} - ${ctx.serviceLabel}`,
    body: [
      "A new travel request has been submitted on Amazingfly.ng.",
      "",
      `Reference: ${ctx.reference}`,
      `Customer: ${ctx.fullName} <${ctx.email}>`,
      `Service: ${ctx.serviceLabel}`,
      `Route: ${ctx.originCountry} to ${ctx.destinationCountry}`,
      `Documents uploaded: ${ctx.documentCount}`,
    ].join("\n"),
  };
}

export function composeStatusUpdate(
  ctx: Pick<RequestNotificationContext, "reference" | "fullName" | "email">,
  status: string,
): ComposedEmail {
  return {
    to: ctx.email,
    kind: "customer_status_update",
    subject: `Update on your travel request ${ctx.reference}`,
    body: [
      `Hello ${ctx.fullName},`,
      "",
      `The status of your travel request ${ctx.reference} is now: ${status}.`,
      "",
      "You can track your request any time on Amazingfly.ng/track.",
      "",
      "Amazingfly Travels - Amazingfly.ng",
    ].join("\n"),
  };
}

async function deliver(message: ComposedEmail) {
  // TODO: replace with the project email sender once the Amazingfly.ng
  // sender domain is verified. Kept side-effect free and non-throwing so a
  // notification problem can never fail a customer submission.
  console.info("[notification]", message.kind, "->", message.to, "|", message.subject);
}

export async function notifyRequestReceived(ctx: RequestNotificationContext) {
  await Promise.all([
    deliver(composeCustomerReceipt(ctx)),
    deliver(composeAdminAlert(ctx)),
  ]).catch((error) => {
    console.error("[notification] delivery failed", error);
  });
}
