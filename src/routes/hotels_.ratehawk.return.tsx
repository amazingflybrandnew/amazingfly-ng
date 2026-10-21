import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Not nested under /hotels (the trailing underscore in the file name): the
 * hotels page has no <Outlet />, so as a child route this page used to render
 * the hotel search form instead of itself.
 *
 * 3D-Secure return path whitelisted with ETG (RateHawk) for the credit-card
 * ("now") booking model. After the payment gateway completes the 3DS check on
 * the corporate card, it redirects here. The booking itself is finalized
 * asynchronously on our server (Check booking process), so this page simply
 * confirms the verification completed and points the customer to their booking.
 */
export const Route = createFileRoute("/hotels_/ratehawk/return")({
  // ETG appends its own query parameters; accept whatever arrives.
  validateSearch: (search: Record<string, unknown>) => search,
  head: () => ({
    meta: [
      { title: "Returning from your bank | Amazingfly.ng" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RateHawkReturn,
});

function RateHawkReturn() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <ShieldCheck className="mb-4 h-14 w-14 text-navy" />
      <h1 className="text-2xl font-semibold">You're back from your bank's check</h1>
      <p className="mt-3 text-muted-foreground">
        We're now confirming the payment and your hotel booking with the provider. This page does
        not mean the payment succeeded: you'll receive a confirmation email once the booking is
        confirmed, and you can track its status from your bookings.
      </p>
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
