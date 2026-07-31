import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Prose } from "@/components/PageParts";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Amazingfly.ng" },
      {
        name: "description",
        content:
          "How Amazingfly Travels handles the personal information shared with us through Amazingfly.ng.",
      },
      { property: "og:title", content: "Privacy Policy | Amazingfly.ng" },
      {
        property: "og:description",
        content: "How Amazingfly Travels handles personal information shared through Amazingfly.ng.",
      },
      { property: "og:url", content: "/privacy-policy" },
    ],
    links: [{ rel: "canonical", href: "/privacy-policy" }],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="This policy explains how Amazingfly Travels treats the information you share with us."
      />
      <Prose>
        <h2>Information we collect</h2>
        <p>
          Amazingfly.ng is currently an informational website. It does not operate accounts, request
          forms or payment processing, and it does not collect or store customer documents. When you
          contact Amazingfly Travels directly, you may share details such as your name, contact
          details, travel plans and supporting documents.
        </p>

        <h2>How information is used</h2>
        <ul>
          <li>To understand your request and respond to it.</li>
          <li>To prepare guidance, checklists or a quotation for you.</li>
          <li>To support your application where you have asked us to.</li>
        </ul>

        <h2>Sharing</h2>
        <p>
          Information is shared only where it is necessary to deliver the service you requested, for
          example with an embassy, insurer, airline or accommodation provider, or where we are required
          to do so by law. We do not sell personal information.
        </p>

        <h2>Retention and your rights</h2>
        <p>
          Information is kept only for as long as it is needed for your request or to meet legal
          obligations. You may ask what information we hold about you, ask for corrections, or ask us
          to delete it where we are not required to retain it.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          This policy will be updated as Amazingfly.ng adds new functionality, including online request
          submission. The current version always appears on this page.
        </p>
      </Prose>
    </>
  );
}
