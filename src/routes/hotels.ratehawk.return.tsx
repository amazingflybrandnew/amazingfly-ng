import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * 3D-Secure return path whitelisted with ETG (RateHawk) for the credit-card
 * ("now") booking model. After the payment gateway completes the 3DS check on
 * the corporate card, it redirects here. The booking itself is finalized
 * asynchronously on our server (Check booking process), so this page simply
 * confirms the verification completed and points the customer to their booking.
 */
export const Route = createFileRoute("/hotels/ratehawk/return")({
  // ETG appends its own query parameters; accept whatever arrives.
  validateSearch: (search: Record<string, unknown>) => search,
  head: () => ({
    meta: [
      { title: "Payment Verified | Amazingfly.ng" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RateHawkReturn,
});

function RateHawkReturn() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-600" />
      <h1 className="text-2xl font-semibold">Payment verification complete</h1>
      <p className="mt-3 text-muted-foreground">
        Thank you — the secure (3D-Secure) check has finished and your hotel booking is being
        finalized with the provider. You'll receive your confirmation by email shortly, and you can
        track the status from your bookings.
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
