import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/PageParts";

/**
 * Enquiry-only placeholder for a service that isn't live yet. Sets expectations
 * honestly (nothing is over-promised) while still capturing interest via the
 * contact page, and steers visitors to the flagship visa service.
 */
export function ComingSoon({
  eyebrow = "Launching soon",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={description} />
      <section className="container-page section-y">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <h2 className="text-xl font-bold text-navy">We’re putting the finishing touches on this</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This service is almost ready. In the meantime our team can handle your request
            personally — reach out with your dates and details and we’ll take care of it and send you
            a quote.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/contact">Request a quote</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/visa">Explore visa services</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
