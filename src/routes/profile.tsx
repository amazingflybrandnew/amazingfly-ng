import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { AccountShell, useSessionQuery } from "@/components/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCustomerProfile } from "@/lib/auth.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile | Amazingfly.ng" },
      {
        name: "description",
        content:
          "Update the name, phone number and nationality Amazingfly Travels uses when processing your visa, flight and travel document requests.",
      },
      { property: "og:title", content: "My Profile | Amazingfly.ng" },
      { property: "og:description", content: "Manage your Amazingfly Travels account details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const inputClass =
  "h-12 rounded-2xl border-white/70 bg-white/80 text-navy shadow-card focus-visible:ring-lavender";

function ProfilePage() {
  const { data: session } = useSessionQuery();
  const queryClient = useQueryClient();
  const update = useServerFn(updateCustomerProfile);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    setFullName(session.user.full_name ?? "");
    setPhone(session.user.phone ?? "");
    setNationality(session.user.nationality ?? "");
  }, [session?.user]);

  const mutation = useMutation({
    mutationFn: () =>
      update({ data: { full_name: fullName, phone, nationality } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setError(result.message);
        setMessage(null);
        return;
      }
      setError(null);
      setMessage(result.message ?? "Profile updated.");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <AccountShell
      title="Profile"
      subtitle="Keep your details accurate so our specialists can reach you quickly."
    >
      <form
        className="glass-card max-w-xl space-y-5 rounded-3xl p-6 md:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-semibold text-navy">
            Email address
          </Label>
          <Input
            id="email"
            value={session?.user?.email ?? ""}
            readOnly
            className={`${inputClass} cursor-not-allowed opacity-70`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-semibold text-navy">
            Full name
          </Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            minLength={2}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-semibold text-navy">
            Phone number
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality" className="text-sm font-semibold text-navy">
            Nationality
          </Label>
          <Input
            id="nationality"
            value={nationality}
            onChange={(event) => setNationality(event.target.value)}
            className={inputClass}
          />
        </div>

        {error ? (
          <p className="rounded-2xl border border-orange/40 bg-peach-tint px-4 py-3 text-sm font-medium text-navy">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-2xl border border-mint/50 bg-mint-tint px-4 py-3 text-sm font-medium text-navy">
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={mutation.isPending}
          className="btn-gradient h-12 w-full rounded-2xl text-white"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            "Save changes"
          )}
        </Button>
      </form>
    </AccountShell>
  );
}
