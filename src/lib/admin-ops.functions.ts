import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  ActivityEntry,
  AdminCustomer,
  AdminCustomerDetail,
  AdminMessage,
  AdminService,
  AdminTestimonial,
  MessageThread,
  SiteContentItem,
} from "./admin-ops.server";

export type {
  ActivityEntry,
  AdminCustomer,
  AdminCustomerDetail,
  AdminMessage,
  AdminService,
  AdminTestimonial,
  MessageThread,
  SiteContentItem,
};

// ---------------------------------------------------------------- customers

export const getAdminCustomers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ search: z.string().trim().max(120).optional() }).strict().parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<AdminCustomer[]> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadCustomers } = await import("./admin-ops.server");
    await requireAdmin("manage_customers");
    return loadCustomers(data.search);
  });

export const getAdminCustomerDetail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<AdminCustomerDetail | null> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadCustomerDetail } = await import("./admin-ops.server");
    await requireAdmin("manage_customers");
    return loadCustomerDetail(data.email);
  });

// ---------------------------------------------------------------- services

export const getAdminServices = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminService[]> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadServices } = await import("./admin-ops.server");
    await requireAdmin("manage_services");
    return loadServices();
  },
);

export const saveAdminService = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(120)
          .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only."),
        short_description: z.string().trim().max(400).optional().default(""),
        description: z.string().trim().max(4000).optional().default(""),
        image_url: z.string().trim().max(600).optional().default(""),
        category: z.string().trim().max(80).optional().default(""),
        price_label: z.string().trim().max(120).optional().default(""),
        cta_label: z.string().trim().max(80).optional().default(""),
        active: z.boolean().optional().default(true),
        display_order: z.number().int().min(0).max(999).optional().default(0),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { saveService } = await import("./admin-ops.server");
    const who = await requireAdmin("manage_services");
    const result = await saveService(data);
    if (result.ok) {
      await logAdminAction(who, data.id ? "Updated a service" : "Created a service", {
        type: "service",
        id: data.id ?? null,
        detail: data.name,
      });
    }
    return result;
  });

export const toggleAdminService = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { setServiceActive } = await import("./admin-ops.server");
    const who = await requireAdmin("manage_services");
    const result = await setServiceActive(data.id, data.active);
    if (result.ok) {
      await logAdminAction(who, data.active ? "Enabled a service" : "Disabled a service", {
        type: "service",
        id: data.id,
      });
    }
    return result;
  });

// ---------------------------------------------------------------- content

export const getSiteContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ content: SiteContentItem[]; testimonials: AdminTestimonial[] }> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadSiteContent, loadTestimonials } = await import("./admin-ops.server");
    await requireAdmin("manage_content");
    const [content, testimonials] = await Promise.all([loadSiteContent(), loadTestimonials()]);
    return { content, testimonials };
  },
);

export const updateSiteContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        entries: z
          .array(
            z.object({
              key: z.string().trim().min(2).max(80),
              value: z.string().max(4000),
            }),
          )
          .min(1)
          .max(60),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { saveSiteContent } = await import("./admin-ops.server");
    const who = await requireAdmin("manage_content");
    const result = await saveSiteContent(data.entries);
    if (result.ok) {
      await logAdminAction(who, "Updated website content", {
        type: "content",
        detail: data.entries.map((entry) => entry.key).join(", ").slice(0, 200),
      });
    }
    return result;
  });

export const saveAdminTestimonial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120),
        location: z.string().trim().max(120).optional().default(""),
        quote: z.string().trim().min(10).max(1000),
        rating: z.number().int().min(1).max(5).optional().default(5),
        is_active: z.boolean().optional().default(true),
        display_order: z.number().int().min(0).max(999).optional().default(0),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { saveTestimonial } = await import("./admin-ops.server");
    const who = await requireAdmin("manage_content");
    const result = await saveTestimonial(data);
    if (result.ok) {
      await logAdminAction(who, data.id ? "Updated a testimonial" : "Added a testimonial", {
        type: "testimonial",
        id: data.id ?? null,
        detail: data.name,
      });
    }
    return result;
  });

export const removeAdminTestimonial = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin, logAdminAction } = await import("./admin.server");
    const { deleteTestimonial } = await import("./admin-ops.server");
    const who = await requireAdmin("manage_content");
    const result = await deleteTestimonial(data.id);
    if (result.ok) {
      await logAdminAction(who, "Removed a testimonial", { type: "testimonial", id: data.id });
    }
    return result;
  });

export const createMediaUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        folder: z.enum(["services", "hero", "destinations", "testimonials"]),
        file_name: z.string().trim().min(1).max(200),
      })
      .strict()
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; path: string; uploadUrl: string; publicUrl: string } | { ok: false; message: string }
    > => {
      const { requireAdmin } = await import("./admin.server");
      const { signMediaUpload } = await import("./admin-ops.server");
      await requireAdmin("manage_content");
      return signMediaUpload(data.folder, data.file_name);
    },
  );

// ---------------------------------------------------------------- messages

type StaffMessageEmailResult =
  | { ok: true }
  | { ok: false; error: string };

async function sendStaffMessageEmail(input: {
  email: string;
  request_id: string | null;
  body: string;
}): Promise<StaffMessageEmailResult> {
  const subject = input.request_id
    ? "New message about your Amazingfly travel request"
    : "New message from Amazingfly Travels";
  const text = [
    "Hello,",
    "",
    "You have a new message from the Amazingfly Travels team:",
    "",
    input.body,
    "",
    "Sign in to your Amazingfly.ng account to view the conversation and reply.",
    "",
    "Amazingfly Travels - Amazingfly.ng",
  ].join("\n");

  try {
    const { sendTransactionalEmail } = await import("./email.server");
    const delivery = await sendTransactionalEmail({ to: input.email, subject, text });

    try {
      const { createExternalSupabaseAdmin } = await import("./external-supabase.server");
      const supabase = createExternalSupabaseAdmin();
      const { error } = await supabase.from("email_notifications").insert({
        event_type: "staff_message",
        recipient_email: input.email,
        subject,
        body: text,
        request_id: input.request_id,
        user_id: null,
        request_reference: null,
        delivery_status: delivery.ok ? "sent" : "failed",
        provider_message_id: delivery.ok ? delivery.id : null,
        error_message: delivery.ok ? null : delivery.error,
        attempt_count: delivery.attempts,
        last_attempt_at: new Date().toISOString(),
      });
      if (error) console.error("[admin] message email audit", error.message);
    } catch (error) {
      console.error("[admin] message email audit", error);
    }

    if (!delivery.ok) {
      console.error("[admin] message email delivery failed", input.email, delivery.error);
      return { ok: false, error: delivery.error };
    }
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown email delivery error";
    console.error("[admin] message email delivery failed", error);
    return { ok: false, error: detail };
  }
}

export const getMessageThreads = createServerFn({ method: "GET" }).handler(
  async (): Promise<MessageThread[]> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadMessageThreads } = await import("./admin-ops.server");
    await requireAdmin("message_customer");
    return loadMessageThreads();
  },
);

export const getRequestMessages = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ request_id: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<AdminMessage[]> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadRequestMessages } = await import("./admin-ops.server");
    await requireAdmin("view");
    return loadRequestMessages(data.request_id);
  });

export const sendAdminMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email(),
        request_id: z.string().uuid().nullish(),
        body: z.string().trim().min(2).max(4000),
        message_id: z.string().uuid(),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { requireAdmin } = await import("./admin.server");
    const { sendCustomerMessage } = await import("./admin-ops.server");
    const who = await requireAdmin("message_customer");
    const result = await sendCustomerMessage(who, {
      email: data.email,
      request_id: data.request_id ?? null,
      body: data.body,
      client_message_id: data.message_id,
    });
    if (!result.ok) return result;

    if (result.created === false) {
      return { ok: true, message: "Message already sent." };
    }

    const email = await sendStaffMessageEmail({
      email: data.email,
      request_id: data.request_id ?? null,
      body: data.body,
    });

    if (!email.ok) {
      return {
        ok: true,
        message: `Message saved to the customer portal, but the email notification failed: ${email.error}`,
      };
    }

    return { ok: true, message: "Message sent and email notification delivered." };
  });

export const markMessageThreadRead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email() }).strict().parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { requireAdmin } = await import("./admin.server");
    const { markThreadRead } = await import("./admin-ops.server");
    await requireAdmin("message_customer");
    return markThreadRead(data.email);
  });

// ---------------------------------------------------------------- activity

export const getAdminActivity = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActivityEntry[]> => {
    const { requireAdmin } = await import("./admin.server");
    const { loadActivity } = await import("./admin-ops.server");
    await requireAdmin("view");
    return loadActivity();
  },
);
