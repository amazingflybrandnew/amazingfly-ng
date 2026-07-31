import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import { Disclaimer, PageHero } from "@/components/PageParts";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Amazingfly Travels | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Get in touch with the Amazingfly Travels team for visa assistance, travel documentation and travel booking support.",
      },
      { property: "og:title", content: "Contact Amazingfly Travels | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Phone, WhatsApp, email and office contact details for Amazingfly Travels.",
      },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

const details = [
  { icon: Phone, label: "Phone", value: "To be confirmed" },
  { icon: MessageCircle, label: "WhatsApp", value: "To be confirmed" },
  { icon: Mail, label: "Email", value: "To be confirmed" },
  { icon: MapPin, label: "Office address", value: "To be confirmed" },
  { icon: Clock, label: "Business hours", value: "To be confirmed" },
  { icon: Share2, label: "Social media", value: "To be confirmed" },
];

function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to the Amazingfly Travels team"
        description="Our contact channels are being finalised and will be published on Amazingfly.ng shortly."
      />
      <section className="container-page section-y">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {details.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-7 shadow-card">
              <item.icon className="h-6 w-6 text-orange" aria-hidden="true" />
              <h2 className="mt-4 text-base font-bold">{item.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 max-w-3xl">
          <Disclaimer>
            Contact details shown here are placeholders. Amazingfly Travels will publish verified phone,
            WhatsApp, email and office information on Amazingfly.ng once confirmed.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
