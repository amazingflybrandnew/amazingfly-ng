export type EmailDeliveryResult =
  | { ok: true; provider: "resend"; id: string | null }
  | { ok: false; provider: "resend"; error: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function env(name: "RESEND_API_KEY" | "EMAIL_FROM" | "EMAIL_REPLY_TO") {
  return process.env[name]?.trim() || "";
}

function safeErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "Unknown email delivery error";
  }
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  attachments?: Array<{ filename: string; content: string }>;
}): Promise<EmailDeliveryResult> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  const replyTo = env("EMAIL_REPLY_TO");

  if (!apiKey) {
    return { ok: false, provider: "resend", error: "RESEND_API_KEY is not configured." };
  }
  if (!from) {
    return { ok: false, provider: "resend", error: "EMAIL_FROM is not configured." };
  }
  if (!input.to.trim()) {
    return { ok: false, provider: "resend", error: "Recipient email address is empty." };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Amazingfly.ng/1.0",
      },
      body: JSON.stringify({
        from,
        to: [input.to.trim()],
        subject: input.subject,
        text: input.text,
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const raw = await response.text();
    let payload: unknown = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    }

    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "")
          : safeErrorMessage(payload);
      return {
        ok: false,
        provider: "resend",
        error: `Resend returned ${response.status}${detail ? `: ${detail}` : ""}`,
      };
    }

    const id =
      payload && typeof payload === "object" && "id" in payload
        ? String((payload as { id?: unknown }).id ?? "") || null
        : null;

    return { ok: true, provider: "resend", id };
  } catch (error) {
    return { ok: false, provider: "resend", error: safeErrorMessage(error) };
  }
}
