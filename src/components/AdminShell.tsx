import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ClipboardList,
  FileText,
  Globe2,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Package,
  PanelsTopLeft,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/admin.functions";
import { signOutCustomer } from "@/lib/auth.functions";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/requests", label: "Requests", icon: ClipboardList },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/services", label: "Services", icon: Package },
  { to: "/admin/content", label: "Website content", icon: PanelsTopLeft },
  { to: "/admin/services-content", label: "Service content", icon: FileText },
  { to: "/admin/destinations", label: "Destinations", icon: Globe2 },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { to: "/admin/activity", label: "Activity", icon: History },
] as const;


export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  travel_agent: "Travel Agent",
  support_staff: "Support Staff",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export function priorityTone(priority: string) {
  switch (priority) {
    case "urgent":
      return "border-coral/50 bg-peach-tint text-navy";
    case "high":
      return "border-orange/40 bg-peach-tint text-navy";
    case "low":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-sky/50 bg-sky-tint text-navy";
  }
}

export function useAdminSession() {
  const fetchAdmin = useServerFn(getAdminSession);
  return useQuery({
    queryKey: ["admin", "session"],
    queryFn: () => fetchAdmin(),
    staleTime: 30_000,
  });
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data, isPending } = useAdminSession();
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

  if (!data?.admin) {
    return (
      <div className="hero-aurora flex min-h-[70vh] items-center justify-center px-4">
        <div className="glass-card w-full max-w-md rounded-3xl p-8 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lavender-tint">
            <ShieldCheck className="h-6 w-6 text-navy" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-navy">Staff access only</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This area is reserved for authorised Amazingfly Travels staff. Sign in with your staff
            account to continue.
          </p>
          <Button asChild size="lg" className="btn-gradient mt-6 w-full text-white">
            <Link to="/auth" search={{ redirect: pathname }}>
              Sign in
            </Link>
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full text-navy-soft">
            <Link to="/dashboard">Back to my account</Link>
          </Button>
        </div>
      </div>
    );
  }

  const admin = data.admin;

  return (
    <div className="hero-aurora relative min-h-screen overflow-hidden">
      <div className="hero-glow hero-glow-a" aria-hidden="true" />
      <div className="hero-glow hero-glow-b" aria-hidden="true" />

      <div className="container-page relative py-10 md:py-14">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="lg:w-64 lg:shrink-0">
            <div className="glass-card rounded-3xl p-4">
              <div className="px-3 pb-3 pt-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-navy-soft">
                  Operations
                </p>
                <p className="mt-2 text-sm font-semibold text-navy">{admin.full_name}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-lavender/50 bg-lavender-tint px-2.5 py-1 text-[11px] font-bold text-navy">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  {ROLE_LABELS[admin.role] ?? admin.role}
                </span>
              </div>
              <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin">
                {NAV.map(({ to, label, icon: Icon }) => {
                  const active = to === "/admin" ? pathname === to : pathname.startsWith(to);
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
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold leading-tight text-navy md:text-4xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {actions}
            </header>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
