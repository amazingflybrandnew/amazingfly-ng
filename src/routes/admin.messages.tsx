import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getMessageThreads,
  markMessageThreadRead,
  sendAdminMessage,
} from "@/lib/admin-ops.functions";
import { formatDate } from "@/lib/request-status";

type MessagesSearch = { email?: string | undefined };

export const Route = createFileRoute("/admin/messages")({
  validateSearch: (search: Record<string, unknown>): MessagesSearch => ({
    email: typeof search["email"] === "string" ? search["email"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Customer Messages | Amazingfly.ng Admin" },
      {
        name: "description",
        content:
          "Staff inbox for Amazingfly Travels: reply to customer enquiries and send updates about their travel requests.",
      },
      { property: "og:title", content: "Customer Messages | Amazingfly.ng Admin" },
      {
        property: "og:description",
        content: "One shared inbox for every customer conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminMessagesPage,
});

function AdminMessagesPage() {
  const { email: emailFromSearch } = Route.useSearch();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<string | null>(emailFromSearch ?? null);
  const [newEmail, setNewEmail] = useState(emailFromSearch ?? "");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const messageIdRef = useRef<string | null>(null);

  const fetchThreads = useServerFn(getMessageThreads);
  const sendFn = useServerFn(sendAdminMessage);
  const markReadFn = useServerFn(markMessageThreadRead);

  const threads = useQuery({
    queryKey: ["admin", "messages"],
    queryFn: () => fetchThreads(),
    refetchInterval: 3_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  const list = threads.data ?? [];
  const thread = useMemo(
    () => list.find((item) => item.email.toLowerCase() === (active ?? "").toLowerCase()) ?? null,
    [list, active],
  );

  useEffect(() => {
    if (!thread || thread.unread === 0) return;
    void markReadFn({ data: { email: thread.email } }).then(() =>
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] }),
    );
  }, [thread, markReadFn, queryClient]);

  const send = useMutation({
    mutationFn: () => {
      messageIdRef.current ??= globalThis.crypto.randomUUID();
      return sendFn({
        data: {
          email: (thread?.email ?? newEmail).trim(),
          request_id: thread?.request_id ?? null,
          body: body.trim(),
          message_id: messageIdRef.current,
        },
      });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setFeedback(result.message ?? "The message could not be sent.");
        return;
      }
      messageIdRef.current = null;
      setFeedback(result.message ?? "Message sent.");
      setBody("");
      setActive((thread?.email ?? newEmail).trim());
      void queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
    },
    onError: () => setFeedback("The message could not be sent."),
  });

  const target = thread?.email ?? newEmail;
  const canSend = body.trim().length > 1 && /.+@.+\..+/.test(target.trim());

  return (
    <AdminShell
      title="Messages"
      subtitle="Reply to customer enquiries and send updates. Customers see your messages inside their account."
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="glass-card rounded-3xl p-4">
          <div className="px-2 pb-3">
            <label
              htmlFor="new-thread-email"
              className="text-xs font-bold uppercase tracking-[0.14em] text-navy-soft"
            >
              Start a conversation
            </label>
            <Input
              id="new-thread-email"
              value={newEmail}
              onChange={(event) => {
                messageIdRef.current = null;
                setNewEmail(event.target.value);
                setActive(null);
              }}
              placeholder="customer@email.com"
              className="mt-2 rounded-2xl border-white/60 bg-white/80"
            />
          </div>

          <div className="max-h-[540px] space-y-1 overflow-y-auto">
            {threads.isPending ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-navy-soft" aria-hidden="true" />
              </div>
            ) : threads.isError ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                <p>The shared inbox could not be refreshed.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl"
                  onClick={() => void threads.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : list.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              list.map((item) => (
                <button
                  key={item.email}
                  type="button"
                  onClick={() => {
                    messageIdRef.current = null;
                    setActive(item.email);
                  }}
                  className={`w-full rounded-2xl px-3 py-3 text-left transition-colors ${
                    thread?.email === item.email
                      ? "bg-white/90 shadow-card"
                      : "hover:bg-white/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-navy">{item.full_name}</span>
                    {item.unread > 0 ? (
                      <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">
                        {item.unread}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.last_message}</p>
                  <p className="mt-1 text-[11px] text-navy-soft">
                    {item.request_reference || item.email}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="glass-card flex min-h-[520px] flex-col rounded-3xl p-6">
          <header className="border-b border-white/60 pb-4">
            <h2 className="text-lg font-extrabold text-navy">
              {thread ? thread.full_name : newEmail || "New conversation"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {thread?.request_reference
                ? `Linked to request ${thread.request_reference}`
                : "General enquiry"}
            </p>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto py-5">
            {thread?.messages.length ? (
              thread.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    message.sender === "admin"
                      ? "ml-auto bg-navy text-white"
                      : "border border-white/70 bg-white/80 text-navy"
                  }`}
                >
                  <p className="whitespace-pre-line">{message.body}</p>
                  <p
                    className={`mt-2 text-[11px] ${
                      message.sender === "admin" ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {message.author} · {formatDate(message.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No messages in this conversation yet.
              </p>
            )}
          </div>

          <div className="border-t border-white/60 pt-4">
            <Textarea
              value={body}
              onChange={(event) => {
                if (!send.isPending) messageIdRef.current = null;
                setBody(event.target.value);
              }}
              rows={3}
              placeholder="Write your message to the customer…"
              aria-label="Message"
              className="rounded-2xl border-white/60 bg-white/80"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{feedback}</p>
              <Button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  send.mutate();
                }}
                disabled={!canSend || send.isPending}
                className="btn-gradient text-white"
              >
                {send.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Send message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
