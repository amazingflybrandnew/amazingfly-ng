import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { services } from "@/data/services";

const linkClass =
  "text-sm font-semibold text-navy transition-colors hover:text-orange data-[status=active]:text-orange";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          <Link to="/" activeOptions={{ exact: true }} className={linkClass}>
            Home
          </Link>

          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-semibold text-navy transition-colors hover:text-orange"
              aria-haspopup="true"
            >
              Services
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="invisible absolute left-1/2 top-full w-72 -translate-x-1/2 pt-4 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <ul className="rounded-xl border border-border bg-card p-2 shadow-lift">
                {services.map((service) => (
                  <li key={service.slug}>
                    <Link
                      to="/services/$slug"
                      params={{ slug: service.slug }}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-navy-tint hover:text-orange"
                    >
                      {service.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Link to="/about" className={linkClass}>
            About
          </Link>
          <Link to="/contact" className={linkClass}>
            Contact
          </Link>
        </nav>

        <div className="hidden lg:block">
          <Button asChild size="lg">
            <Link to="/request">Start a Request</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-navy lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-5" aria-label="Mobile navigation">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-semibold text-navy hover:bg-navy-tint"
            >
              Home
            </Link>

            <button
              type="button"
              onClick={() => setMobileServicesOpen((open) => !open)}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-semibold text-navy hover:bg-navy-tint"
              aria-expanded={mobileServicesOpen}
            >
              Services
              <ChevronDown
                className={`h-4 w-4 transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {mobileServicesOpen ? (
              <ul className="mb-1 ml-3 flex flex-col border-l-2 border-orange/40 pl-3">
                {services.map((service) => (
                  <li key={service.slug}>
                    <Link
                      to="/services/$slug"
                      params={{ slug: service.slug }}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-soft hover:text-orange"
                    >
                      {service.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            <Link
              to="/about"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-semibold text-navy hover:bg-navy-tint"
            >
              About
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-semibold text-navy hover:bg-navy-tint"
            >
              Contact
            </Link>

            <Button asChild size="lg" className="mt-3">
              <Link to="/request" onClick={() => setMobileOpen(false)}>
                Start a Request
              </Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
