import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePasswordReset } from "@/lib/auth.functions";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a New Password | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Set a new password for your Amazingfly Travels account and get straight back to tracking your travel requests.",
      },
      { property: "og:title", content: "Choose a New Password | Amazingfly.ng" },
      { property: "og:description", content: "Set a new Amazingfly Travels account password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
const [refreshToken, setRefreshToken] = useState<string | null>(null);
const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const complete = useServerFn(completePasswordReset);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
const refresh = hash.get("refresh_token");

if (accessToken && refresh) {
  setToken(accessToken);
  setRefreshToken(refresh);
} else {
  setError("This reset link is invalid or has expired. Request a new one.");
}
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
  complete({
    data: {
      access_token: token!,
      refresh_token: refreshToken!,
      password,
    },
  }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setMessage(result.message ?? "Password updated.");
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="hero-aurora relative min-h-[calc(100vh-5rem)] overflow-hidden">
      <div className="hero-glow hero-glow-b" aria-hidden="true" />
      <div className="container-page relative flex min-h-[calc(100vh-5rem)] items-center justify-center py-14">
        <div className="glass-card w-full max-w-md rounded-[2rem] p-8 md:p-10">
          <h1 className="text-3xl font-extrabold text-navy">Choose a new password</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Pick something at least 8 characters long that you have not used before.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (token) mutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-navy">
                New password
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-soft"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="h-12 rounded-2xl border-white/70 bg-white/80 pl-11 text-navy shadow-card focus-visible:ring-lavender"
                />
              </div>
            </div>

            {error ? (
              <p className="fade-slide-in rounded-2xl border border-orange/40 bg-peach-tint px-4 py-3 text-sm font-medium text-navy">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="fade-slide-in rounded-2xl border border-mint/50 bg-mint-tint px-4 py-3 text-sm font-medium text-navy">
                {message}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={!token || mutation.isPending}
              className="btn-gradient h-12 w-full rounded-2xl text-base font-semibold text-white shadow-lift"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                "Update password"
              )}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/auth" className="font-semibold text-navy underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
