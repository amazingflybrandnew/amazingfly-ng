/**
 * Server-only customer session handling for Amazingfly Travels.
 *
 * The travel data lives in the existing Supabase project, which is only
 * reachable with server-side secrets. So authentication runs entirely through
 * server functions: tokens are kept in httpOnly cookies (never readable by
 * browser JavaScript) and every data call re-verifies the access token.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import { createExternalSupabase } from "./external-supabase.server";

const ACCESS_COOKIE = "af_at";
const REFRESH_COOKIE = "af_rt";

export type SessionTokens = { access_token: string; refresh_token: string; expires_in?: number };

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  nationality: string;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge,
  };
}

export function setSessionCookies(tokens: SessionTokens) {
  setCookie(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_in ?? 3600));
  setCookie(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(60 * 60 * 24 * 30));
}

export function clearSessionCookies() {
  deleteCookie(ACCESS_COOKIE, { path: "/" });
  deleteCookie(REFRESH_COOKIE, { path: "/" });
}

/** Supabase client that acts as the signed-in customer (RLS applies). */
export function createUserClient(accessToken: string): SupabaseClient {
  const url = process.env["EXTERNAL_SUPABASE_URL"]!;
  const key = process.env["EXTERNAL_SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function toSessionUser(user: {
  id: string;
  email?: string | undefined;
  user_metadata?: Record<string, unknown> | undefined;
}): SessionUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: typeof meta["full_name"] === "string" ? meta["full_name"] : "",
    phone: typeof meta["phone"] === "string" ? meta["phone"] : "",
    nationality: typeof meta["nationality"] === "string" ? meta["nationality"] : "",
  };
}

/**
 * Verifies the current session against Supabase Auth, transparently refreshing
 * the access token when it has expired. Returns null when signed out.
 */
export async function getAuthenticatedUser(): Promise<
  { user: SessionUser; accessToken: string } | null
> {
  const access = getCookie(ACCESS_COOKIE);
  const refresh = getCookie(REFRESH_COOKIE);
  const anon = createExternalSupabase();

  if (access) {
    const { data, error } = await anon.auth.getUser(access);
    if (!error && data.user) return { user: toSessionUser(data.user), accessToken: access };
  }

  if (refresh) {
    const { data, error } = await anon.auth.refreshSession({ refresh_token: refresh });
    if (!error && data.session && data.user) {
      setSessionCookies({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        ...(data.session.expires_in ? { expires_in: data.session.expires_in } : {}),
      });
      return { user: toSessionUser(data.user), accessToken: data.session.access_token };
    }
  }

  clearSessionCookies();
  return null;
}

/** Same as above but throws when there is no session. */
export async function requireUser() {
  const session = await getAuthenticatedUser();
  if (!session) throw new Error("Please sign in to continue.");
  return session;
}

/** Keeps the profiles row in sync with the auth user. */
export async function syncProfile(user: SessionUser) {
  const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
  const admin = createExternalSupabaseAdmin();
  const { error } = await admin.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email,
      full_name: user.full_name || user.email,
      phone: user.phone || null,
      nationality: user.nationality || null,
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("[profiles] sync failed", error.message);
}
