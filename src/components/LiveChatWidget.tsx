import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

import { useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getLiveChatConversation,
  sendLiveChatMessage,
} from "@/lib/account.functions";

function messageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function LiveChatWidget() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const session = useSessionQuery();
  const fetchConversation = useServerFn(getLiveChatConversation);
  const sendMessage = useServerFn(sendLiveChatMessage);

  const conversation = useQuery({
    queryKey: ["live-chat"],
    queryFn: () => fetchConversation(),
    enabled: open && Boolean(session.data?.user),
    refetchInterval: open ? 5_000 : false,
  });

  const send = useMutation({
    mutationFn: () => sendMessage({ data: { body: body.trim() } }),
    onSuccess: (result) => {
      if (!result.ok) {
        setFeedback(result.message ?? "Your message could not be sent.");
        return;
      }
      setBody("");
      setFeedback(null);
      void queryClient.invalidateQueries({ queryKey: ["live-chat"] });
    },
    onError: () => setFeedback("Your message could not be sent. Please try again."),
  });

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, conversation.data?.length]);

  if (pathname.startsWith("/admin")) return null;

  const user = session.data?.user;
  const messages = conversation.data ?? [];

  return (
    <div className="fixed bottom-5 right-4 z-[70] sm:bottom-6 sm:right-6">
      {open ? (
        <section
          className="mb-3 flex h-[min(560px,calc(100vh-110px))] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
          aria-label="Amazingfly live chat"
        >
          <header className="flex items-center justify-between bg-navy px-5 py-4 text-white">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
                <h2 className="font-extrabold">Live chat</h2>
              </div>
              <p className="mt-0.5 text-xs text-white/75">Chat with Amazingfly support</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              aria-label="Close live chat"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          {!user && !session.isPending ? (
            <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
              <div className="rounded-full bg-coral/10 p-4">
                <MessageCircle className="h-7 w-7 text-coral" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-navy">Sign in to start chatting</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your conversation stays private and is saved in your Amazingfly account.
              </p>
              <Button asChild className="btn-gradient mt-5 w-full text-white">
                <Link to="/auth" search={{ redirect: pathname }}>
                  Sign in or create account
                </Link>
              </Button>
            </div>
          ) : session.isPending ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-4 py-5" aria-live="polite">
                {conversation.isPending ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-navy-soft" aria-hidden="true" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-2xl border border-coral/15 bg-white p-4 text-sm leading-6 text-navy-soft shadow-sm">
                    Hello! How can the Amazingfly team help with your travel plans today?
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        message.sender === "customer"
                          ? "ml-auto rounded-br-md bg-navy text-white"
                          : "rounded-bl-md border border-slate-100 bg-white text-navy"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <p
                        className={`mt-1.5 text-[10px] ${
                          message.sender === "customer" ? "text-white/65" : "text-muted-foreground"
                        }`}
                      >
                        {message.sender === "customer" ? "You" : message.author} · {messageTime(message.created_at)}
                      </p>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t bg-white p-4">
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (body.trim().length >= 2 && !send.isPending) send.mutate();
                    }
                  }}
                  rows={2}
                  maxLength={4000}
                  placeholder="Type your message…"
                  aria-label="Live chat message"
                  className="resize-none rounded-2xl"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-destructive">{feedback}</p>
                  <Button
                    type="button"
                    onClick={() => send.mutate()}
                    disabled={body.trim().length < 2 || send.isPending}
                    className="btn-gradient rounded-xl text-white"
                  >
                    {send.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-gradient ml-auto flex h-14 items-center gap-2 rounded-full px-5 font-bold text-white shadow-xl transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-label={open ? "Close live chat" : "Open live chat"}
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
        <span>{open ? "Close" : "Live chat"}</span>
      </button>
    </div>
  );
}
