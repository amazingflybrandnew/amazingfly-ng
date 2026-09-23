import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, FileText, Globe2, MapPin } from "lucide-react";

import { PageHero } from "@/components/PageParts";
import { Button } from "@/components/ui/button";
import {
  getVisaDestination,
  visaPricing,
  formatNairaAmount,
  VISA_PROOF_FEE,
} from "@/lib/visa/destinations";

export const Route = createFileRoute("/visa/$slug")({
  loader: ({ params }) => {
    const destination = getVisaDestination(params.slug);
    if (!destination) throw notFound();
    return { name: destination.name, route: destination.route };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Destination not found | Amazingfly.ng" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.name} Visa from Nigeria | Amazingfly.ng`;
    const description =
      loaderData.route === "evisa"
        ? `Apply online for your ${loaderData.name} e-Visa from Nigeria. Amazingfly completes and submits your application on the official portal.`
        : `Full ${loaderData.name} visa requirements for Nigerian applicants, with expert support from Amazingfly Travels.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `/visa/${params.slug}` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/visa/${params.slug}` }],
    };
  },
  notFoundComponent: DestinationNotFound,
  component: VisaDestinationPage,
});

function DestinationNotFound() {
  return (
    <div className="container-page section-y text-center">
      <h1 className="text-3xl font-extrabold">Destination not available</h1>
      <p className="mt-3 text-muted-foreground">
        Amazingfly doesn't currently handle visas for that destination.
      </p>
      <Button asChild className="mt-6">
        <Link to="/visa">Browse all destinations</Link>
      </Button>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-white/80 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy-tint">
        <Icon className="h-4.5 w-4.5 text-navy" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-navy">{value}</p>
      </div>
    </div>
  );
}

function VisaDestinationPage() {
  const { slug } = Route.useParams();
  const destination = getVisaDestination(slug);

  if (!destination) return <DestinationNotFound />;

  const isEvisa = destination.route === "evisa";
  const centreLabel = isEvisa
    ? "Apply online (e-Visa)"
    : destination.centre === "US Embassy"
      ? "US Embassy / Consulate"
      : destination.centre === "Embassy"
        ? "Embassy / High Commission"
        : `${destination.centre} centre, Nigeria`;

  return (
    <>
      <PageHero
        eyebrow={isEvisa ? "e-Visa · Apply online" : "Visa application · Submit in Nigeria"}
        title={`${destination.flag} ${destination.name} visa`}
        description={
          isEvisa
            ? `${destination.name} offers an online e-Visa to Nigerian passport holders. Amazingfly completes and submits your application on the official government portal and sends your approved e-Visa by email.`
            : `Everything Nigerian applicants need to apply for a ${destination.name} visa, with document review and support from Amazingfly Travels.`
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link
              to="/request"
              search={{ service: "visa-assistance", from: "Nigeria", to: destination.name }}
            >
              Apply with Amazingfly
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/visa">Browse all destinations</Link>
          </Button>
        </div>
      </PageHero>

      <div className="container-page section-y">
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoPill
            icon={isEvisa ? Globe2 : MapPin}
            label="How to apply"
            value={centreLabel}
          />
          <InfoPill icon={Clock} label="Processing time" value={destination.processingTime} />
          <InfoPill icon={FileText} label="Visa types" value={destination.visaTypes.join(" · ")} />
        </div>

        {destination.centreNote ? (
          <p className="mt-4 rounded-2xl border border-border bg-navy-tint/60 px-4 py-3 text-sm text-navy">
            {destination.centreNote}
          </p>
        ) : null}

        {destination.eligibilityNote ? (
          <div className="mt-4 rounded-2xl border border-orange/40 bg-orange-tint p-5">
            <p className="text-sm font-bold uppercase tracking-wide text-orange">Eligibility</p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-navy">
              {destination.eligibilityNote}
            </p>
          </div>
        ) : null}

        {(() => {
          const pricing = visaPricing(destination);
          return (
            <div className="mt-6 rounded-3xl border border-border bg-white/85 p-6 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-extrabold text-navy">Pricing</h2>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  per applicant
                </span>
              </div>
              {pricing.fixed ? (
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                    <dt className="font-extrabold text-navy">Package price (all-inclusive)</dt>
                    <dd className="font-extrabold text-navy">
                      {formatNairaAmount(pricing.perApplicant)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Visa fee</dt>
                    <dd className="font-semibold text-navy">{formatNairaAmount(pricing.visaFee)}</dd>
                  </div>
                  {pricing.processingFee > 0 ? (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        {isEvisa ? "e-Visa processing" : "VFS / centre + courier"}
                      </dt>
                      <dd className="font-semibold text-navy">
                        {formatNairaAmount(pricing.processingFee)}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Amazingfly service charge</dt>
                    <dd className="font-semibold text-navy">
                      {formatNairaAmount(pricing.serviceCharge)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                    <dt className="font-extrabold text-navy">Total per applicant</dt>
                    <dd className="font-extrabold text-navy">
                      {formatNairaAmount(pricing.perApplicant)}
                    </dd>
                  </div>
                </dl>
              )}
              {destination.noVisaProof ? (
                <p className="mt-4 rounded-2xl border border-border bg-navy-tint/60 p-4 text-sm leading-relaxed text-navy">
                  This is a fixed-price package. All fees are non-refundable, and the Visa Proof
                  option does not apply.
                </p>
              ) : (
                <div className="mt-4 rounded-2xl border border-mint/40 bg-mint-tint p-4 text-sm leading-relaxed text-navy">
                  <p className="font-bold">
                    Optional: Visa Proof (+{formatNairaAmount(VISA_PROOF_FEE)} per applicant)
                  </p>
                  <p className="mt-1">
                    Add Visa Proof and, if your visa is <strong>refused</strong>, we refund your
                    Amazingfly service charge. The visa fee, VFS/e-Visa fee and the Visa Proof fee
                    itself are non-refundable.
                  </p>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Totals multiply by the number of applicants. The exact amount is confirmed at
                checkout.
              </p>
            </div>
          );
        })()}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="text-2xl font-extrabold text-navy">
              {isEvisa ? "What you'll need" : "Visa requirements"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isEvisa
                ? "The documents typically required for the online application:"
                : `Prepare the following for your ${destination.name} application. Requirements can vary by visa type and applicant profile.`}
            </p>
            <ul className="mt-6 space-y-3">
              {(destination.documents ?? []).map((doc) => (
                <li key={doc} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint" aria-hidden="true" />
                  <span className="text-sm leading-relaxed text-navy">{doc}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl border border-orange/30 bg-orange-tint p-5">
              <p className="text-sm font-medium leading-relaxed text-navy">
                This checklist is a practical guide, not a guarantee. Embassies and immigration
                authorities set and change the final requirements, and the decision on every
                application rests solely with them. Amazingfly provides application assistance and
                document review — we do not guarantee visa approval.
              </p>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-white/85 p-6 shadow-card">
              <h3 className="text-lg font-extrabold text-navy">
                {isEvisa ? "Let us handle your e-Visa" : "Get expert help with your application"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Our specialists review your documents, complete the forms and guide you through every
                step for {destination.name}.
              </p>
              <Button asChild className="mt-5 w-full" size="lg">
                <Link
                  to="/request"
                  search={{ service: "visa-assistance", from: "Nigeria", to: destination.name }}
                >
                  Start my application
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Applying from Nigeria 🇳🇬
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
