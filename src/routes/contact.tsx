import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import { PageHero } from "@/components/PageParts";
import { contactDetails } from "@/data/contact";

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
  {
    icon: Phone,
    label: "Phone",
    value: contactDetails.phoneDisplay,
    href: contactDetails.phoneHref,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: contactDetails.whatsappDisplay,
    href: contactDetails.whatsappHref,
  },
  { icon: Mail, label: "Email", value: contactDetails.email, href: contactDetails.emailHref },
  { icon: MapPin, label: "Office address", value: contactDetails.address },
  { icon: Clock, label: "Business hours", value: contactDetails.businessHours },
];

function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to the Amazingfly Travels team"
        description="Contact our travel support team by phone, WhatsApp, email or through our social media channels."
      />
      <section className="container-page section-y">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {details.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-7 shadow-card">
              <item.icon className="h-6 w-6 text-orange" aria-hidden="true" />
              <h2 className="mt-4 text-base font-bold">{item.label}</h2>
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  className="mt-2 block break-words text-sm font-medium text-navy-soft transition-colors hover:text-orange"
                >
                  {item.value}
                </a>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{item.value}</p>
              )}
            </div>
          ))}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-card">
            <Share2 className="h-6 w-6 text-orange" aria-hidden="true" />
            <h2 className="mt-4 text-base font-bold">Social media</h2>
            <div className="mt-2 flex flex-col gap-2 text-sm font-medium">
              <a
                href={contactDetails.facebook}
                target="_blank"
                rel="noreferrer"
                className="text-navy-soft transition-colors hover:text-orange"
              >
                Facebook
              </a>
              <a
                href={contactDetails.instagram}
                target="_blank"
                rel="noreferrer"
                className="text-navy-soft transition-colors hover:text-orange"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
