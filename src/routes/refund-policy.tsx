import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Prose } from "@/components/PageParts";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy | Amazingfly.ng" },
      {
        name: "description",
        content:
          "How refunds are handled for service fees and third-party fees paid through Amazingfly Travels.",
      },
      { property: "og:title", content: "Refund Policy | Amazingfly.ng" },
      {
        property: "og:description",
        content: "How Amazingfly Travels handles refunds for service and third-party fees.",
      },
      { property: "og:url", content: "/refund-policy" },
    ],
    links: [{ rel: "canonical", href: "/refund-policy" }],
  }),
  component: RefundPolicy,
});

function RefundPolicy() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Refund Policy"
        description="How refunds work for Amazingfly Travels service fees and for fees paid to third parties."
      />
      <Prose>
        <h2>Service fees</h2>
        <p>
          Service fees cover the professional time, guidance, document review and coordination provided
          by Amazingfly Travels. Where work has already begun, service fees are generally
          non-refundable. Where no work has started, a refund request will be considered.
        </p>

        <h2>Third-party and official fees</h2>
        <p>
          Embassy fees, government fees, medical or health authority fees, airline fares, hotel charges
          and insurance premiums are set and collected by third parties. Refunds for these amounts
          follow the rules of the relevant organisation, and Amazingfly Travels cannot guarantee them.
        </p>

        <h2>Refused applications</h2>
        <p>
          A refused visa or a delayed decision is not grounds for a refund of service fees, because the
          decision is made by the issuing authority and not by Amazingfly Travels.
        </p>

        <h2>How to request a refund</h2>
        <p>
          Contact Amazingfly Travels with your request details. Each request is reviewed individually,
          and we will explain clearly what can and cannot be refunded.
        </p>

        <h2>Payments</h2>
        <p>
          Online payment is not yet available on Amazingfly.ng. This policy will be expanded when
          payment functionality is introduced.
        </p>
      </Prose>
    </>
  );
}
