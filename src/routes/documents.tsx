import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { DocumentList } from "@/components/DocumentList";
import { DocumentRequestList } from "@/components/DocumentRequestList";

import { getAccountOverview } from "@/lib/account.functions";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "My Travel Documents | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Manage the passport, photo and supporting documents you have uploaded for your Amazingfly Travels requests, and download them any time.",
      },
      { property: "og:title", content: "My Travel Documents | Amazingfly.ng" },
      {
        property: "og:description",
        content: "All documents uploaded to your Amazingfly Travels requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { data: session } = useSessionQuery();
  const fetchOverview = useServerFn(getAccountOverview);
  const { data, isPending } = useQuery({
    queryKey: ["account", "overview"],
    queryFn: () => fetchOverview(),
    enabled: Boolean(session?.user),
  });

  return (
    <AccountShell
      title="Documents"
      subtitle="Everything you have uploaded across your travel requests, kept private to your account."
    >
      <section className="glass-card mb-6 rounded-3xl p-6 md:p-8">
        <h2 className="text-xl font-extrabold text-navy">Documents required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Documents our specialists have asked you to upload. Each one attaches to the right
          request automatically.
        </p>
        <div className="mt-5">
          {isPending ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
            </div>
          ) : (
            <DocumentRequestList items={data?.documentRequests ?? []} showReference />
          )}
        </div>
      </section>

      <div className="glass-card rounded-3xl p-6 md:p-8">
        <h2 className="mb-5 text-xl font-extrabold text-navy">Uploaded documents</h2>
        {isPending ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
          </div>
        ) : (
          <DocumentList documents={data?.documents ?? []} showReference />
        )}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        To add a new document, open the request it belongs to from{" "}
        <span className="font-semibold text-navy">My Requests</span>.
      </p>
    </AccountShell>
  );
}
