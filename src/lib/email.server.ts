export type EmailDeliveryResult =
  | { ok: true; provider: "resend"; id: string | null; attempts: number }
  | { ok: false; provider: "resend"; error: string; attempts: number };

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [300, 900];

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

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  attachments?: Array<{ filename: string; content: string }>;
  idempotencyKey?: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  const replyTo = env("EMAIL_REPLY_TO");

  if (!apiKey) {
    return { ok: false, provider: "resend", error: "RESEND_API_KEY is not configured.", attempts: 0 };
  }
  if (!from) {
    return { ok: false, provider: "resend", error: "EMAIL_FROM is not configured.", attempts: 0 };
  }
  if (!input.to.trim()) {
    return { ok: false, provider: "resend", error: "Recipient email address is empty.", attempts: 0 };
  }

  const idempotencyKey = input.idempotencyKey?.trim() || crypto.randomUUID();
  let lastError = "Unknown email delivery error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          "User-Agent": "Amazingfly.ng/1.0",
        },
        body: JSON.stringify({
          from,
          to: [input.to.trim().toLowerCase()],
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

      if (response.ok) {
        const id =
          payload && typeof payload === "object" && "id" in payload
            ? String((payload as { id?: unknown }).id ?? "") || null
            : null;
        return { ok: true, provider: "resend", id, attempts: attempt };
      }

      const detail =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "")
          : safeErrorMessage(payload);
      lastError = `Resend returned ${response.status}${detail ? `: ${detail}` : ""}`;
      if (!retryableStatus(response.status) || attempt === MAX_ATTEMPTS) {
        return { ok: false, provider: "resend", error: lastError, attempts: attempt };
      }
    } catch (error) {
      lastError = safeErrorMessage(error);
      if (attempt === MAX_ATTEMPTS) {
        return { ok: false, provider: "resend", error: lastError, attempts: attempt };
      }
    }

    await wait(RETRY_DELAYS_MS[attempt - 1] ?? 900);
  }

  return { ok: false, provider: "resend", error: lastError, attempts: MAX_ATTEMPTS };
}
