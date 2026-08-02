import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2 } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { getAdminActivity } from "@/lib/admin-ops.functions";
import { formatDate } from "@/lib/request-status";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Audit trail of every staff action taken inside the Amazingfly Travels admin area, with the staff member, action and time.",
      },
      { property: "og:title", content: "Activity Log | Amazingfly.ng Admin" },
      { property: "og:description", content: "See who changed what, and when." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminActivityPage,
});

function AdminActivityPage() {
  const fetchActivity = useServerFn(getAdminActivity);
  const { data, isPending } = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => fetchActivity(),
  });

  const rows = data ?? [];

  return (
    <AdminShell
      title="Activity log"
      subtitle="A complete audit trail of staff actions across requests, documents, services and website content."
    >
      {isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
          No staff activity recorded yet.
        </div>
      ) : (
        <ol className="glass-card space-y-1 rounded-3xl p-4">
          {rows.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-2xl px-3 py-3 hover:bg-white/60"
            >
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-lavender-tint">
                <History className="h-4 w-4 text-navy" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">
                  {entry.admin_name} · {entry.action}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[entry.entity_type, entry.detail].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-[11px] text-navy-soft">{formatDate(entry.created_at)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </AdminShell>
  );
}
