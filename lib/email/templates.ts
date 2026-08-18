import "server-only";
import { brand, wrapEmail, button, appUrl } from "@/lib/email/render";

export type BuiltEmail = { subject: string; html: string; text: string };

const h1 = `font-family:${brand.serif};font-size:24px;line-height:32px;font-weight:700;color:${brand.ink};margin:0 0 12px;`;
const p = `font-family:${brand.sans};font-size:15px;line-height:24px;color:${brand.muted};margin:0 0 16px;`;

/**
 * The illuminated code plate — the signature element. A dark indigo panel with
 * gold, widely-tracked digits, like a lamp readout.
 */
function codePlate(code: string): string {
  const digits = code
    .split("")
    .map(
      (d) =>
        `<span style="display:inline-block;font-family:${brand.serif};font-size:34px;font-weight:700;color:${brand.gold};padding:0 6px;">${d}</span>`
    )
    .join("");
  return `
  <div style="background:${brand.indigo};border-radius:12px;padding:22px 16px;text-align:center;margin:8px 0 20px;">
    <div style="font-family:${brand.sans};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-bottom:8px;">Your code</div>
    <div style="white-space:nowrap;">${digits}</div>
  </div>`;
}

/** OTP email for account verification (register) or password reset. */
export function otpEmail(code: string, purpose: "REGISTER" | "RESET"): BuiltEmail {
  const isReset = purpose === "RESET";
  const subject = isReset
    ? `Reset your Lumen password — code ${code}`
    : `Verify your Lumen account — code ${code}`;
  const heading = isReset ? "Reset your password" : "Verify your account";
  const lead = isReset
    ? "Use this code to set a new password. It keeps your account yours."
    : "Welcome. Enter this code to confirm it's really you and finish setting up.";

  const inner = `
    <h1 style="${h1}">${heading}</h1>
    <p style="${p}">${lead}</p>
    ${codePlate(code)}
    <p style="font-family:${brand.sans};font-size:13px;line-height:20px;color:${brand.muted};margin:0;">
      This code expires in <strong style="color:${brand.ink};">10 minutes</strong>. If you didn't
      request it, you can safely ignore this email${isReset ? " — your password won't change." : "."}
    </p>`;

  const text = `${heading}\n\n${lead}\n\nYour code: ${code}\n\nThis code expires in 10 minutes. If you didn't request it, ignore this email.`;

  return { subject, html: wrapEmail(inner, { preheader: `Your Lumen code is ${code}` }), text };
}

/** Welcome email after a successful registration. */
export function welcomeEmail(fullName: string, needsApproval: boolean): BuiltEmail {
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const subject = needsApproval
    ? "Your Lumen application is in review"
    : "Welcome to Lumen";

  const body = needsApproval
    ? `<p style="${p}">Thanks for applying, ${firstName}. An admin is reviewing your account now — we'll email you the moment it's approved, and then you can start teaching.</p>`
    : `<p style="${p}">You're in, ${firstName}. Your account is ready — browse courses, enroll for free, and pick up where curiosity leads.</p>`;

  const cta = needsApproval
    ? ""
    : `<div style="margin:24px 0 8px;">${button("Explore courses", appUrl("/courses"))}</div>`;

  const inner = `
    <h1 style="${h1}">${needsApproval ? "Application received" : "Welcome to Lumen"}</h1>
    ${body}
    ${cta}`;

  const text = needsApproval
    ? `Application received\n\nThanks for applying, ${firstName}. An admin is reviewing your account and we'll email you once it's approved.`
    : `Welcome to Lumen\n\nYou're in, ${firstName}. Your account is ready. Explore courses: ${appUrl("/courses")}`;

  return { subject, html: wrapEmail(inner, { preheader: needsApproval ? "We're reviewing your application." : "Your account is ready." }), text };
}

/** Internal notification sent to the team when a contact form is submitted. */
export function contactNotificationEmail(msg: {
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message: string;
}): BuiltEmail {
  const row = (label: string, value: string) => `
    <tr>
      <td style="font-family:${brand.sans};font-size:12px;color:${brand.muted};padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="font-family:${brand.sans};font-size:14px;color:${brand.ink};padding:6px 0;">${value}</td>
    </tr>`;

  const inner = `
    <h1 style="${h1}">New contact message</h1>
    <p style="${p}">Someone reached out through the Lumen contact form.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${brand.hairline};border-bottom:1px solid ${brand.hairline};margin:0 0 16px;padding:4px 0;">
      ${row("Name", escapeHtml(msg.name))}
      ${msg.email ? row("Email", escapeHtml(msg.email)) : ""}
      ${msg.phone ? row("Phone", escapeHtml(msg.phone)) : ""}
      ${msg.subject ? row("Subject", escapeHtml(msg.subject)) : ""}
    </table>
    <div style="font-family:${brand.sans};font-size:15px;line-height:24px;color:${brand.ink};white-space:pre-wrap;">${escapeHtml(msg.message)}</div>`;

  const text = `New contact message\n\nName: ${msg.name}\nEmail: ${msg.email ?? "—"}\nPhone: ${msg.phone ?? "—"}\nSubject: ${msg.subject ?? "—"}\n\n${msg.message}`;

  return { subject: `New contact: ${msg.subject || msg.name}`, html: wrapEmail(inner, { preheader: `From ${msg.name}` }), text };
}

/** Confirmation sent back to the person who submitted the contact form. */
export function contactAckEmail(name: string): BuiltEmail {
  const firstName = name.trim().split(/\s+/)[0] || "there";
  const inner = `
    <h1 style="${h1}">Thanks for reaching out</h1>
    <p style="${p}">We've got your message, ${firstName}, and a real person will read it. Expect a reply within one business day.</p>
    <p style="font-family:${brand.sans};font-size:13px;line-height:20px;color:${brand.muted};margin:0;">In the meantime, feel free to keep exploring — no need to reply to this note.</p>`;
  const text = `Thanks for reaching out\n\nWe've got your message, ${firstName}, and a real person will read it. Expect a reply within one business day.`;
  return { subject: "We received your message", html: wrapEmail(inner, { preheader: "A real person will reply within one business day." }), text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
