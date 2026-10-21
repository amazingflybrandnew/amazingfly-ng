import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { confirmHotelPaymentAfterThreeDs } from "@/lib/travel-api/hotel-booking.functions";

/**
 * Not nested under /hotels (the trailing underscore in the file name): the
 * hotels page has no <Outlet />, so as a child route this page used to render
 * the hotel search form instead of itself.
 *
 * 3D-Secure return path whitelisted with ETG (RateHawk) for the credit-card
 * ("now") booking model. After the bank's 3DS check the payment gateway
 * redirects here with ?order=<partner_order_id>. ETG requires us to keep
 * polling booking/finish/status until a final status, so this page does that
 * and shows the real outcome.
 */
export const Route = createFileRoute("/hotels_/ratehawk/return")({
  // ETG/the gateway may append their own query parameters; accept whatever arrives.
  validateSearch: (search: Record<string, unknown>) => search,
  head: () => ({
    meta: [
      { title: "Confirming your booking | Amazingfly.ng" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RateHawkReturn,
});

/** Each server call polls for up to ~45 s; this allows ~6 minutes in total. */
const MAX_ROUNDS = 8;

type Outcome = "checking" | "ok" | "failed" | "pending" | "unknown";

function RateHawkReturn() {
  const search = Route.useSearch() as Record<string, unknown>;
  const order = typeof search["order"] === "string" ? search["order"] : "";
  const confirm = useServerFn(confirmHotelPaymentAfterThreeDs);
  const [outcome, setOutcome] = useState<Outcome>(order ? "checking" : "unknown");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    (async () => {
      for (let round = 0; round < MAX_ROUNDS && !cancelled; round++) {
        const result = await confirm({ data: { partnerOrderId: order } }).catch(() => null);
        if (cancelled) return;
        if (result?.ok && result.status === "ok") {
          setOutcome("ok");
          return;
        }
        if (result?.ok && result.status === "failed") {
          setOutcome("failed");
          setDetail(result.providerStatus ?? result.message);
          return;
        }
      }
      if (!cancelled) setOutcome("pending");
    })();
    return () => {
      cancelled = true;
    };
  }, [order, confirm]);

  const view = {
    checking: {
      icon: <Loader2 className="mb-4 h-14 w-14 animate-spin text-navy" />,
      title: "Confirming your payment and booking…",
      body: "You're back from your bank's check. Please keep this page open while we confirm the payment and your hotel booking with the provider. This can take a minute or two.",
    },
    ok: {
      icon: <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-600" />,
      title: "Booking confirmed",
      body: "The payment went through and your hotel booking is confirmed. You'll receive your confirmation by email shortly.",
    },
    failed: {
      icon: <XCircle className="mb-4 h-14 w-14 text-orange" />,
      title: "The payment didn't go through",
      body: "The provider could not complete this booking, so it has not been confirmed. Please contact us and we'll help you rebook.",
    },
    pending: {
      icon: <ShieldCheck className="mb-4 h-14 w-14 text-navy" />,
      title: "Still being confirmed",
      body: "The provider hasn't returned a final status yet. We'll keep tracking it and email you as soon as the booking is confirmed.",
    },
    unknown: {
      icon: <ShieldCheck className="mb-4 h-14 w-14 text-navy" />,
      title: "You're back from your bank's check",
      body: "We're confirming the payment and your hotel booking with the provider. You'll receive a confirmation email once the booking is confirmed, and you can track its status from your bookings.",
    },
  }[outcome];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      {view.icon}
      <h1 className="text-2xl font-semibold">{view.title}</h1>
      <p className="mt-3 text-muted-foreground">{view.body}</p>
      {detail ? <p className="mt-2 text-xs text-muted-foreground">Reference: {detail}</p> : null}
      {order ? <p className="mt-2 text-xs text-muted-foreground">Order: {order}</p> : null}
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link to="/dashboard">View my bookings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
