import "server-only";
import { Resend } from "resend";
import type { BuiltEmail } from "@/lib/email/templates";

/**
 * Thin wrapper over Resend. Configuration is read from the environment:
 *   RESEND_API_KEY      — API key (required to actually deliver)
 *   RESEND_FROM_EMAIL   — verified sender, e.g. "noreply@yourdomain.com"
 *   CONTACT_NOTIFY_EMAIL — where contact-form notifications are routed
 *
 * When RESEND_API_KEY is absent (local dev without a key), emails are logged to
 * the server console instead of sent, so flows never break during development.
 */

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Lumen <onboarding@resend.dev>";
const fromName = "Lumen";

let client: Resend | null = null;
function resend(): Resend | null {
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function contactNotifyAddress(): string | null {
  return process.env.CONTACT_NOTIFY_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? null;
}

/** The configured sender, formatted with the brand display name. */
function sender(): string {
  return fromEmail.includes("<") ? fromEmail : `${fromName} <${fromEmail}>`;
}

type SendResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Send an email. Never throws — callers treat delivery as best-effort so a mail
 * hiccup can't break the primary action (signup, reset, contact).
 */
export async function sendEmail(
  to: string | string[],
  email: BuiltEmail
): Promise<SendResult> {
  const rc = resend();

  if (!rc) {
    console.log(
      `[email] (dev — no RESEND_API_KEY) to=${Array.isArray(to) ? to.join(",") : to} subject=${email.subject}`
    );
    return { ok: true };
  }

  try {
    const { data, error } = await rc.emails.send({
      from: sender(),
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] send threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
