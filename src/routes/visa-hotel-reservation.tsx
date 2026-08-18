import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Backward-compatible alias for older Visa Hotel Reservation links.
 * The product intentionally uses the existing hotel search/booking flow.
 */
export const Route = createFileRoute("/visa-hotel-reservation")({
  beforeLoad: () => {
    throw redirect({ to: "/hotels", replace: true });
  },
  component: () => null,
});
