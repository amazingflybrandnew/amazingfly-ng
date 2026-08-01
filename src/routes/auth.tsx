import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Mail, Phone, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, signInCustomer, signUpCustomer } from "@/lib/auth.functions";

type AuthSearch = { redirect?: string | undefined; mode?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
    ...(typeof search["mode"] === "string" ? { mode: search["mode"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign In or Create an Account | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Sign in to your Amazingfly Travels account to track visa, flight, hotel and travel document requests, upload documents and receive updates.",
      },
      { property: "og:title", content: "Sign In or Create an Account | Amazingfly.ng" },
      {
        property: "og:description",
        content: "Access your Amazingfly Travels customer dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "h-12 rounded-2xl border-white/70 bg-white/80 pl-11 text-navy shadow-card focus-visible:ring-lavender";

function Field({
  id,
  label,
  icon: Icon,
  ...props
}: {
  id: string;
  label: string;
  icon: typeof Mail;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold text-navy">
        {label}
      </Label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-soft"
          aria-hidden="true"
        />
        <Input id={id} className={inputClass} {...props} />
      </div>
    </div>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(
    search.mode === "signup" ? "signup" : "signin",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = useServerFn(signInCustomer);
  const signUp = useServerFn(signUpCustomer);
  const resetPassword = useServerFn(requestPasswordReset);

  const afterSignIn = async () => {
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    navigate({ to: search.redirect && search.redirect.startsWith("/") ? search.redirect : "/dashboard" });
  };

  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
      if (mode === "signin") {
        return signIn({ data: { email: values["email"]!, password: values["password"]! } });
      }
      if (mode === "signup") {
        return signUp({
          data: {
            full_name: values["full_name"]!,
            email: values["email"]!,
            phone: values["phone"] ?? "",
            nationality: values["nationality"] ?? "",
            password: values["password"]!,
          },
        });
      }
      return resetPassword({ data: { email: values["email"]! } });
    },
    onSuccess: async (result) => {
      setError(null);
      setMessage(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.signedIn) {
        await afterSignIn();
        return;
      }
      setMessage(result.message ?? "Done.");
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="hero-aurora relative min-h-[calc(100vh-5rem)] overflow-hidden">
      <div className="hero-glow hero-glow-a" aria-hidden="true" />
      <div className="hero-glow hero-glow-c" aria-hidden="true" />

      <div className="container-page relative flex min-h-[calc(100vh-5rem)] items-center justify-center py-14">
        <div className="glass-card w-full max-w-lg rounded-[2rem] p-8 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy-soft">
            Amazingfly Travels
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy md:text-4xl">
            {mode === "signup"
              ? "Create your travel account"
              : mode === "reset"
                ? "Reset your password"
                : "Welcome back"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {mode === "signup"
              ? "Track every request, upload documents and get updates in one calm place."
              : mode === "reset"
                ? "We will email you a secure link to choose a new password."
                : "Sign in to track your travel requests and documents."}
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(event.currentTarget);
            }}
          >
            {mode === "signup" ? (
              <>
                <Field
                  id="full_name"
                  name="full_name"
                  label="Full name"
                  icon={UserRound}
                  required
                  autoComplete="name"
                  placeholder="John Adewale"
                />
                <Field
                  id="phone"
                  name="phone"
                  label="Phone number"
                  icon={Phone}
                  autoComplete="tel"
                  placeholder="0801 234 5678"
                />
              </>
            ) : null}

            <Field
              id="email"
              name="email"
              type="email"
              label="Email address"
              icon={Mail}
              required
              autoComplete="email"
              placeholder="you@email.com"
            />

            {mode !== "reset" ? (
              <Field
                id="password"
                name="password"
                type="password"
                label="Password"
                icon={Lock}
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              />
            ) : null}

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
              disabled={mutation.isPending}
              className="btn-gradient h-12 w-full rounded-2xl text-base font-semibold text-white shadow-lift"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : mode === "signup" ? (
                "Create account"
              ) : mode === "reset" ? (
                "Send reset link"
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                <p>
                  New to Amazingfly?{" "}
                  <button
                    type="button"
                    className="font-semibold text-navy underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    Create an account
                  </button>
                </p>
                <p>
                  <button
                    type="button"
                    className="font-semibold text-navy underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode("reset");
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    Forgot your password?
                  </button>
                </p>
              </>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-navy underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setMessage(null);
                  }}
                >
                  Sign in
                </button>
              </p>
            )}
            <p className="pt-2">
              Prefer not to sign in?{" "}
              <Link to="/track" className="font-semibold text-navy underline-offset-4 hover:underline">
                Track a request with your reference
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
