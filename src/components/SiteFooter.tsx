import { Link } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import amazingflyLogo from "@/assets/amazingfly-logo.jpeg";
import { services } from "@/data/services";

const companyLinks = [
  { label: "Home", to: "/" as const },
  { label: "About", to: "/about" as const },
  { label: "Contact", to: "/contact" as const },
  { label: "Start a Request", to: "/request" as const },
];

const policyLinks = [
  { label: "Privacy Policy", to: "/privacy-policy" as const },
  { label: "Terms", to: "/terms" as const },
  { label: "Refund Policy", to: "/refund-policy" as const },
  { label: "Disclaimer", to: "/disclaimer" as const },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={amazingflyLogo}
              alt="Amazingfly Travels logo"
              className="h-12 w-12 rounded-full object-cover"
              width={48}
              height={48}
              loading="lazy"
            />
            <div>
              <p className="text-base font-extrabold">Amazingfly Travels</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange">
                Amazingfly.ng
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
            Amazingfly Travels is a travel documentation, visa assistance and travel booking support
            business for Nigerian travellers. Amazingfly.ng is our digital platform.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Services</h3>
          <ul className="mt-5 space-y-3">
            {services.map((service) => (
              <li key={service.slug}>
                <Link
                  to="/services/$slug"
                  params={{ slug: service.slug }}
                  className="text-sm text-white/75 transition-colors hover:text-orange"
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Company</h3>
          <ul className="mt-5 space-y-3">
            {companyLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-white/75 transition-colors hover:text-orange">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-white">Legal</h3>
          <ul className="mt-5 space-y-3">
            {policyLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-white/75 transition-colors hover:text-orange">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Contact</h3>
          <ul className="mt-5 space-y-4 text-sm text-white/75">
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
              <span>Phone: to be confirmed</span>
            </li>
            <li className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
              <span>WhatsApp: to be confirmed</span>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
              <span>Email: to be confirmed</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden="true" />
              <span>Office address: to be confirmed</span>
            </li>
          </ul>
          <Link
            to="/contact"
            className="mt-6 inline-block text-sm font-semibold text-orange hover:underline"
          >
            View all contact details
          </Link>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Amazingfly Travels. All rights reserved.</p>
          <p>Amazingfly.ng &mdash; travel documentation and booking support.</p>
        </div>
      </div>
    </footer>
  );
}
