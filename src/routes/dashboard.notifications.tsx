import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  BellRing,
  CheckCheck,
  CreditCard,
  FileWarning,
  Loader2,
  MessageSquare,
  Plane,
} from "lucide-react";

import { AccountShell } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { getAccountOverview, markNotificationsRead } from "@/lib/account.functions";
import { formatDate } from "@/lib/request-status";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Centre | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Every Amazingfly Travels update in one place: application status changes, document requests, payment confirmations and messages from your travel specialist.",
      },
      { property: "og:title", content: "Notification Centre | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Status updates, document requests and payment confirmations for your travel applications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { filter?: Filter } => {
    const value = search["filter"];
    const allowed: Filter[] = ["all", "status", "documents", "payments", "messages"];
    return typeof value === "string" && allowed.includes(value as Filter)
      ? { filter: value as Filter }
      : {};
  },
  component: NotificationsPage,
});

type Filter = "all" | "status" | "documents" | "payments" | "messages";

const FILTERS: { id: Filter; label: string; icon: typeof Bell }[] = [
  { id: "all", label: "All", icon: Bell },
  { id: "status", label: "Status updates", icon: Plane },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "documents", label: "Document requests", icon: FileWarning },
  { id: "payments", label: "Payment updates", icon: CreditCard },
];

function classify(title: string, message: string): Filter {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes("payment") || text.includes("refund")) return "payments";
  if (text.includes("document") || text.includes("upload")) return "documents";
  if (text.includes("message") || text.includes("replied") || text.includes("reply")) {
    return "messages";
  }
  return "status";
}

function toneFor(kind: Filter) {
  switch (kind) {
    case "payments":
      return { chip: "bg-mint-tint text-navy border-mint/50", icon: CreditCard };
    case "documents":
      return { chip: "bg-peach-tint text-navy border-orange/40", icon: FileWarning };
    case "messages":
      return { chip: "bg-lavender-tint text-navy border-lavender/50", icon: MessageSquare };
    default:
      return { chip: "bg-sky-tint text-navy border-sky/50", icon: Plane };
  }
}

function NotificationsPage() {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getAccountOverview);
  const markRead = useServerFn(markNotificationsRead);

  const { data, isPending } = useQuery({
    queryKey: ["account", "overview"],
    queryFn: () => fetchOverview(),
  });

  const markAll = useMutation({
    mutationFn: () => markRead({ data: { id: null } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account", "overview"] }),
  });

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((note) => !note.read_status).length;

  const search = Route.useSearch();
  const active: Filter = search.filter ?? "all";

  const visible = notifications.filter(
    (note) => active === "all" || classify(note.title, note.message) === active,
  );

  return (
    <AccountShell
      title="Notification centre"
      subtitle="Status updates, messages, document requests and payment confirmations for every Amazingfly Travels application."
    >
      {isPending ? (
        <div className="glass-card flex items-center justify-center rounded-3xl p-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender-tint">
                <BellRing className="h-5 w-5 text-navy" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-extrabold text-navy">
                  {unread > 0 ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You are all caught up"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {notifications.length} notification{notifications.length === 1 ? "" : "s"} in total
                </p>
              </div>
            </div>
            <Button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || unread === 0}
              className="btn-gradient text-white"
            >
              {markAll.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              Mark all as read
            </Button>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Filter notifications">
            {FILTERS.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                to="/dashboard/notifications"
                search={id === "all" ? {} : { filter: id }}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  active === id
                    ? "border-transparent bg-white text-navy shadow-card"
                    : "border-border bg-white/60 text-navy-soft hover:bg-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          {visible.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing here yet. We will notify you the moment an application moves forward, a
                document is needed or a payment is confirmed.
              </p>
              <Button asChild variant="ghost" className="mt-4 text-navy-soft">
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((note) => {
                const kind = classify(note.title, note.message);
                const tone = toneFor(kind);
                const Icon = tone.icon;
                return (
                  <li
                    key={note.id}
                    className={`glass-card rounded-3xl p-5 ${
                      note.read_status ? "" : "ring-1 ring-lavender/60"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tone.chip}`}
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-navy">{note.title}</p>
                          {!note.read_status ? (
                            <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[11px] font-bold text-navy">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {note.message}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(note.created_at)}
                          </span>
                          {note.request_id ? (
                            <Button asChild variant="ghost" size="sm" className="h-auto p-0 text-navy-soft">
                              <Link to="/requests/$id" params={{ id: note.request_id }}>
                                View request
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </AccountShell>
  );
}
