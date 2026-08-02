import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, FileText, LayoutDashboard, Loader2, LogOut, Plane, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSession, signOutCustomer } from "@/lib/auth.functions";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/my-requests", label: "My Requests", icon: Plane },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function useSessionQuery() {
  const fetchSession = useServerFn(getSession);
  return useQuery({
    queryKey: ["session"],
    queryFn: () => fetchSession(),
    staleTime: 30_000,
  });
}

export function AccountShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data, isPending } = useSessionQuery();
  const signOutFn = useServerFn(signOutCustomer);

  const signOut = useMutation({
    mutationFn: () => signOutFn(),
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      navigate({ to: "/auth", replace: true });
    },
  });

  if (isPending) {
    return (
      <div className="hero-aurora flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-navy-soft" aria-hidden="true" />
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="hero-aurora flex min-h-[70vh] items-center justify-center px-4">
        <div className="glass-card w-full max-w-md rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-extrabold text-navy">Sign in to continue</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your travel requests, documents and updates live in your Amazingfly account.
          </p>
          <Button asChild size="lg" className="btn-gradient mt-6 w-full text-white">
            <Link to="/auth" search={{ redirect: pathname }}>
              Sign in or create an account
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const firstName = (data.user.full_name || data.user.email).split(" ")[0];

  return (
    <div className="hero-aurora relative min-h-screen overflow-hidden">
      <div className="hero-glow hero-glow-a" aria-hidden="true" />
      <div className="hero-glow hero-glow-b" aria-hidden="true" />

      <div className="container-page relative py-10 md:py-14">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="lg:w-64 lg:shrink-0">
            <div className="glass-card rounded-3xl p-4">
              <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">
                {firstName}&rsquo;s account
              </p>
              <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Account">
                {NAV.map(({ to, label, icon: Icon }) => {
                  const active = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-white/90 text-navy shadow-card"
                          : "text-navy-soft hover:bg-white/60 hover:text-navy"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
              <button
                type="button"
                onClick={() => signOut.mutate()}
                className="mt-2 flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-navy-soft transition-colors hover:bg-white/60 hover:text-navy"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <header className="mb-8">
              <h1 className="text-3xl font-extrabold leading-tight text-navy md:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </header>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
