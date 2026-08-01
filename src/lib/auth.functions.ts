import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AuthResult =
  | { ok: true; signedIn: boolean; message?: string }
  | { ok: false; message: string };

export type SessionResponse = {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    nationality: string;
  } | null;
};

/** Current signed-in customer, or null. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionResponse> => {
    const { getAuthenticatedUser } = await import("./auth.server");
    const session = await getAuthenticatedUser();
    return { user: session?.user ?? null };
  },
);

export const signUpCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(160),
        email: z.string().trim().email().max(200),
        phone: z.string().trim().max(40).optional().default(""),
        nationality: z.string().trim().max(120).optional().default(""),
        password: z.string().min(8).max(72),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { createExternalSupabase } = await import("./external-supabase.server");
    const { setSessionCookies, syncProfile } = await import("./auth.server");

    const origin = getRequestUrl().origin;
    const supabase = createExternalSupabase();
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email.toLowerCase(),
      password: data.password,
      options: {
        emailRedirectTo: origin,
        data: {
          full_name: data.full_name,
          phone: data.phone,
          nationality: data.nationality,
        },
      },
    });

    if (error) return { ok: false, message: error.message };

    if (result.session && result.user) {
      setSessionCookies({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        ...(result.session.expires_in ? { expires_in: result.session.expires_in } : {}),
      });
      await syncProfile({
        id: result.user.id,
        email: result.user.email ?? data.email,
        full_name: data.full_name,
        phone: data.phone,
        nationality: data.nationality,
      });
      return { ok: true, signedIn: true };
    }

    return {
      ok: true,
      signedIn: false,
      message: "Check your email to confirm your account, then sign in.",
    };
  });

export const signInCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(200),
        password: z.string().min(1).max(72),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    const { createExternalSupabase } = await import("./external-supabase.server");
    const { setSessionCookies, syncProfile } = await import("./auth.server");

    const supabase = createExternalSupabase();
    const { data: result, error } = await supabase.auth.signInWithPassword({
      email: data.email.toLowerCase(),
      password: data.password,
    });
    if (error || !result.session || !result.user) {
      return { ok: false, message: error?.message ?? "Invalid email or password." };
    }

    setSessionCookies({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
      ...(result.session.expires_in ? { expires_in: result.session.expires_in } : {}),
    });
    const meta = result.user.user_metadata ?? {};
    await syncProfile({
      id: result.user.id,
      email: result.user.email ?? data.email,
      full_name: typeof meta["full_name"] === "string" ? meta["full_name"] : "",
      phone: typeof meta["phone"] === "string" ? meta["phone"] : "",
      nationality: typeof meta["nationality"] === "string" ? meta["nationality"] : "",
    });
    return { ok: true, signedIn: true };
  });

export const signOutCustomer = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const { clearSessionCookies } = await import("./auth.server");
    clearSessionCookies();
    return { ok: true };
  },
);

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email().max(200) }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const { createExternalSupabase } = await import("./external-supabase.server");
    const supabase = createExternalSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email.toLowerCase(), {
      redirectTo: `${getRequestUrl().origin}/reset-password`,
    });
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      signedIn: false,
      message: "If that email is registered, a reset link is on its way.",
    };
  });

/** Completes a reset using the recovery token from the emailed link. */
export const completePasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        access_token: z.string().min(10).max(4000),
        password: z.string().min(8).max(72),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    const { createUserClient } = await import("./auth.server");
    const client = createUserClient(data.access_token);
    const { error } = await client.auth.updateUser({ password: data.password });
    if (error) return { ok: false, message: error.message };
    return { ok: true, signedIn: false, message: "Password updated. You can sign in now." };
  });

export const updateCustomerProfile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(160),
        phone: z.string().trim().max(40),
        nationality: z.string().trim().max(120),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<AuthResult> => {
    const { requireUser, createUserClient, syncProfile } = await import("./auth.server");
    const { user, accessToken } = await requireUser();
    const client = createUserClient(accessToken);
    const { error } = await client.auth.updateUser({
      data: {
        full_name: data.full_name,
        phone: data.phone,
        nationality: data.nationality,
      },
    });
    if (error) return { ok: false, message: error.message };
    await syncProfile({ ...user, ...data });
    return { ok: true, signedIn: true, message: "Profile updated." };
  });
