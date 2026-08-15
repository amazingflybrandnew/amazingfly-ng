import { createFileRoute, redirect } from "@tanstack/react-router";

type PaymentSearch = {
  reference?: string | undefined;
  trxref?: string | undefined;
};

/**
 * Compatibility route for links created by the earlier service-payment flow.
 *
 * Amazingfly now has one customer checkout authority: /checkout/$requestId,
 * backed by payment_transactions and the current Paystack integration. Keeping
 * a second payment screen backed by service_requests.agreed_fee caused the UI
 * to show "To be confirmed" while a real pending transaction already existed.
 *
 * Old bookmarks and auth-return URLs remain valid by redirecting them into the
 * authoritative checkout and forwarding any Paystack callback reference.
 */
export const Route = createFileRoute("/payment/$requestId")({
  validateSearch: (search: Record<string, unknown>): PaymentSearch => ({
    ...(typeof search["reference"] === "string" ? { reference: search["reference"] } : {}),
    ...(typeof search["trxref"] === "string" ? { trxref: search["trxref"] } : {}),
  }),
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/checkout/$requestId",
      params: { requestId: params.requestId },
      search: {
        ...(search.reference ? { reference: search.reference } : {}),
        ...(search.trxref ? { trxref: search.trxref } : {}),
      },
      replace: true,
    });
  },
});
