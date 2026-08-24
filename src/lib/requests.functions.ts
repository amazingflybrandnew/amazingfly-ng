import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ServiceOption = {
  id: string;
  name: string;
  slug: string;
  cta_label: string;
  price_label: string | null;
  display_order: number;
};

// Customer-supplied fields only. `.strict()` rejects any extra key, so
// workflow columns (request_status, payment_status, agreed_fee, staff_notes)
// can never be written from the website — they stay under staff control and
// keep their database defaults.
const requestInput = z.object({
  request_reference: z.string().regex(/^AF-\d{8}-[A-Z0-9]{6}$/),
  service_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(1).max(40),
  whatsapp: z.string().trim().max(40).nullable(),
  destination: z.string().trim().max(160).nullable(),
  travel_date: z.string().trim().min(1).nullable(),
  request_details: z.string().trim().min(1).max(4000),
  preferred_contact: z.enum(["whatsapp", "phone", "email"]),
  consent_to_contact: z.literal(true),
}).strict();

export const getActiveServices = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServiceOption[]> => {
    const { createExternalSupabase } = await import("./external-supabase.server");
    const supabase = createExternalSupabase();
    const { data, error } = await supabase
      .from("services")
      .select("id, name, slug, cta_label, price_label, display_order")
      .eq("active", true)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ServiceOption[];
  },
);

export const submitServiceRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; code?: string }> => {
    const { requireUser } = await import("./auth.server");
    const { user, accessToken } = await requireUser();
    if (!user.email || data.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      return { ok: false, code: "AUTH_EMAIL_MISMATCH" };
    }

    const { createUserClient } = await import("./auth.server");
    const supabase = createUserClient(accessToken);
    const { error } = await supabase
      .from("service_requests")
      .insert({ ...data, email: user.email, user_id: user.id });
    if (error) return { ok: false, ...(error.code ? { code: error.code } : {}) };
    return { ok: true };
  });
