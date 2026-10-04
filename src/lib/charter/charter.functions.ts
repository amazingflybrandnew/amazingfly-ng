/**
 * Flight Charter: a quote-based request flow.
 *
 * The customer submits a charter request (no price). It is saved as a
 * service_request with requires_quote=true and no amount. An admin then sets a
 * quotation (saveRequestQuote), which flips requires_quote off, sets the amount
 * and notifies the customer to pay through the normal checkout. There is no
 * supplier API — fulfilment is handled by the Amazingfly team.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const legSchema = z.object({
  from: z.string().trim().min(2).max(120),
  to: z.string().trim().min(2).max(120),
  date: z.string().trim().min(4).max(32),
  time: z.string().trim().max(16).optional().default(""),
});

const charterInput = z
  .object({
    tripScope: z.enum(["local", "international"]),
    tripType: z.enum(["one_way", "round_trip", "multi_leg"]),
    fromLocation: z.string().trim().max(120).optional().default(""),
    toLocation: z.string().trim().max(120).optional().default(""),
    departureDate: z.string().trim().max(32).optional().default(""),
    departureTime: z.string().trim().max(16).optional().default(""),
    returnDate: z.string().trim().max(32).optional().default(""),
    returnTime: z.string().trim().max(16).optional().default(""),
    legs: z.array(legSchema).max(8).optional().default([]),
    passengers: z.number().int().min(1).max(500),
    aircraftPreference: z.string().trim().max(80).optional().default("No preference"),
    purpose: z.string().trim().max(80).optional().default(""),
    specialRequests: z.string().trim().max(1500).optional().default(""),
    budgetRange: z.string().trim().max(120).optional().default(""),
    luggageCargo: z.string().trim().max(200).optional().default(""),
    flexibleDates: z.boolean().optional().default(false),
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(5).max(40),
    whatsapp: z.string().trim().max(40).optional().default(""),
    consentToContact: z.literal(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.tripType === "multi_leg") {
      if (value.legs.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["legs"],
          message: "Please add at least two legs for a multi-leg trip.",
        });
      }
    } else {
      if (!value.fromLocation) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fromLocation"], message: "Departure location is required." });
      }
      if (!value.toLocation) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toLocation"], message: "Destination is required." });
      }
      if (!value.departureDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["departureDate"], message: "Departure date is required." });
      }
      if (value.tripType === "round_trip" && !value.returnDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["returnDate"], message: "Return date is required for a round trip." });
      }
    }
  });

export type CharterRequestInput = z.infer<typeof charterInput>;

export type CharterRequestResult =
  | { ok: true; reference: string; requestId: string }
  | { ok: false; message: string; reason?: "auth" };

const TRIP_TYPE_LABEL: Record<CharterRequestInput["tripType"], string> = {
  one_way: "One way",
  round_trip: "Round trip",
  multi_leg: "Multi-leg",
};

export const submitCharterRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => charterInput.parse(data))
  .handler(async ({ data }): Promise<CharterRequestResult> => {
    const { getAuthenticatedUser } = await import("../auth.server");
    const session = await getAuthenticatedUser();
    if (!session?.user) {
      return { ok: false, reason: "auth", message: "Please sign in to submit your charter request." };
    }
    const user = session.user;

    const { createExternalSupabaseAdmin } = await import("../external-supabase.server");
    const supabase = createExternalSupabaseAdmin();

    const scopeLabel = data.tripScope === "local" ? "Local (within Nigeria)" : "International";
    const routeSummary =
      data.tripType === "multi_leg"
        ? data.legs.map((l) => `${l.from} → ${l.to}`).join(", ")
        : `${data.fromLocation} → ${data.toLocation}`;

    // Everything is captured as answers so nothing is lost, and folded into
    // request_details as a backup if dynamic columns are not present.
    const answers: { id: string; question: string; answer: string }[] = [
      { id: "trip_scope", question: "Trip scope", answer: scopeLabel },
      { id: "trip_type", question: "Trip type", answer: TRIP_TYPE_LABEL[data.tripType] },
      { id: "route", question: "Route", answer: routeSummary },
    ];
    if (data.tripType !== "multi_leg") {
      answers.push({ id: "from", question: "From", answer: data.fromLocation });
      answers.push({ id: "to", question: "To", answer: data.toLocation });
      answers.push({
        id: "departure",
        question: "Departure",
        answer: [data.departureDate, data.departureTime].filter(Boolean).join(" "),
      });
      if (data.tripType === "round_trip") {
        answers.push({
          id: "return",
          question: "Return",
          answer: [data.returnDate, data.returnTime].filter(Boolean).join(" "),
        });
      }
    } else {
      data.legs.forEach((l, i) => {
        answers.push({
          id: `leg_${i + 1}`,
          question: `Leg ${i + 1}`,
          answer: `${l.from} → ${l.to} on ${[l.date, l.time].filter(Boolean).join(" ")}`,
        });
      });
    }
    answers.push({ id: "passengers", question: "Passengers", answer: String(data.passengers) });
    answers.push({ id: "aircraft_preference", question: "Aircraft preference", answer: data.aircraftPreference });
    if (data.purpose) answers.push({ id: "purpose", question: "Purpose", answer: data.purpose });
    answers.push({ id: "flexible_dates", question: "Flexible dates", answer: data.flexibleDates ? "Yes" : "No" });
    if (data.budgetRange) answers.push({ id: "budget_range", question: "Budget range", answer: data.budgetRange });
    if (data.luggageCargo) answers.push({ id: "luggage_cargo", question: "Luggage / cargo", answer: data.luggageCargo });
    if (data.specialRequests) answers.push({ id: "special_requests", question: "Special requests", answer: data.specialRequests });

    const { generateRequestReference } = await import("../request-reference");
    const reference = generateRequestReference();

    const details = [
      "Flight charter request submitted online.",
      answers.filter((a) => a.answer).map((a) => `${a.question}: ${a.answer}`).join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 8000);

    // Keep a customer record (one per email).
    await supabase
      .from("customers")
      .upsert(
        {
          full_name: data.fullName,
          email: data.email.toLowerCase(),
          phone: data.phone,
          whatsapp: data.whatsapp || null,
        },
        { onConflict: "email" },
      );

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("slug", "flight-charter")
      .maybeSingle();

    const baseRow: Record<string, unknown> = {
      request_reference: reference,
      service_id: service?.id ?? null,
      user_id: user.id,
      service_type: "Flight Charter",
      destination: routeSummary.slice(0, 200),
      destination_country: data.tripType === "multi_leg" ? null : data.toLocation || null,
      origin_country: data.tripType === "multi_leg" ? null : data.fromLocation || null,
      travel_purpose: data.purpose || "Charter",
      travel_date: data.tripType === "multi_leg" ? (data.legs[0]?.date ?? null) : data.departureDate || null,
      return_date: data.tripType === "round_trip" ? data.returnDate || null : null,
      traveller_count: data.passengers,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp || null,
      request_details: details,
      preferred_contact: data.whatsapp ? "whatsapp" : "email",
      consent_to_contact: true,
    };
    const dynamicRow: Record<string, unknown> = {
      ...baseRow,
      service_category: "charter",
      answers,
      requires_quote: true,
      payment_status: "pending_payment",
      currency: "NGN",
    };

    let { data: request, error } = await supabase
      .from("service_requests")
      .insert(dynamicRow)
      .select("id")
      .maybeSingle();

    if (error?.code === "42703" || error?.code === "PGRST204") {
      ({ data: request, error } = await supabase
        .from("service_requests")
        .insert(baseRow)
        .select("id")
        .maybeSingle());
    }
    if (error || !request) {
      return { ok: false, message: error?.message ?? "Could not save your charter request." };
    }

    // Acknowledge by email (best-effort; never blocks submission).
    try {
      const { sendTransactionalEmail } = await import("../email.server");
      await sendTransactionalEmail({
        to: data.email,
        subject: `We've received your flight charter request - ${reference}`,
        text: `Hello ${data.fullName},

Thank you for your flight charter request with Amazingfly Travels.

Reference: ${reference}
Trip: ${scopeLabel} · ${TRIP_TYPE_LABEL[data.tripType]}
Route: ${routeSummary}
Passengers: ${data.passengers}

Our charter team will review your request and send you a personalised quotation shortly. Once you receive and accept the quote, you can complete payment securely online.

Amazingfly Travels`,
        idempotencyKey: `charter-received-${reference}`,
      });
    } catch (err) {
      console.error("[charter] acknowledgement email failed", err);
    }

    return { ok: true, reference, requestId: request.id };
  });
