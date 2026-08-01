import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, PackageSearch } from "lucide-react";

import { PageHero } from "@/components/PageParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackTravelRequest, type TrackResult } from "@/lib/travel-request.functions";

const STATUS_LABELS: Record<string, string> = {
  new_request: "New Request",
  received: "New Request",
  under_review: "Under Review",
  documents_required: "Documents Required",
  processing: "Processing",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
};

type TrackSearch = { reference?: string | undefined };

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>): TrackSearch =>
    typeof search["reference"] === "string" ? { reference: search["reference"] } : {},
  head: () => ({
    meta: [
      { title: "Track Your Travel Request | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Check the live status of your Amazingfly Travels request using your request reference number and email address.",
      },
      { property: "og:title", content: "Track Your Travel Request | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Look up the status of your visa, flight, hotel or document request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/track" }],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { reference: initialReference } = Route.useSearch();
  const lookup = useServerFn(trackTravelRequest);

  const [reference, setReference] = useState(initialReference ?? "");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!reference.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter your request reference and the email you used.");
      return;
    }
    setLoading(true);
    try {
      setResult(await lookup({ data: { reference: reference.trim(), email: email.trim() } }));
    } catch {
      setError("We could not check your request right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Requests"
        title="Track Your Request"
        description="Enter your request reference and the email you used to see the current status."
      />
      <section className="container-page section-y">
        <div className="mx-auto max-w-xl">
          <form onSubmit={handleSubmit} noValidate className="glass-card rounded-3xl p-6 md:p-10">
            <div className="grid gap-6">
              <div>
                <Label htmlFor="reference" className="text-sm font-semibold text-navy">
                  Request reference
                </Label>
                <Input
                  id="reference"
                  className="mt-2"
                  placeholder="AF-20260801-AB12CD"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="track-email" className="text-sm font-semibold text-navy">
                  Email address
                </Label>
                <Input
                  id="track-email"
                  type="email"
                  className="mt-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}
              <div>
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…
                    </>
                  ) : (
                    "Check Status"
                  )}
                </Button>
              </div>
            </div>
          </form>

          {result ? (
            <div className="glass-card mt-6 rounded-3xl p-6 md:p-8">
              {result.found ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
                    {result.reference}
                  </p>
                  <p className="mt-3 text-2xl font-extrabold tracking-tight text-navy">
                    {STATUS_LABELS[result.status] ?? result.status}
                  </p>
                  <dl className="mt-5 grid gap-2 text-sm">
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">Service:</dt>
                      <dd className="font-medium text-navy">{result.service_type ?? "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">Destination:</dt>
                      <dd className="font-medium text-navy">{result.destination ?? "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">Submitted:</dt>
                      <dd className="font-medium text-navy">
                        {new Date(result.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <PackageSearch className="h-6 w-6 shrink-0 text-muted-foreground" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We could not find a request with that reference and email combination. Please
                    check both and try again, or{" "}
                    <Link to="/contact" className="font-semibold text-coral hover:underline">
                      contact our team
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
