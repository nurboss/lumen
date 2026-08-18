import "server-only";

/**
 * Shared brand tokens and the base HTML shell for all Lumen emails.
 *
 * Email clients are a hostile rendering target: no external fonts, unreliable
 * CSS, and inconsistent `<style>` support. So everything here is table-based
 * with inline styles and web-safe font stacks. The one signature element is the
 * illuminated wordmark / code plate — kept as the single bold moment.
 */

export const brand = {
  ink: "#191A2C", // deep indigo-black — primary text
  indigo: "#3A2E6E", // brand indigo — the code plate
  gold: "#E7A93B", // lamp gold — the accent, used with restraint
  muted: "#6C6F86", // secondary text
  hairline: "#E7E7F0", // dividers
  canvas: "#EEF0F7", // cool periwinkle page background (not cream)
  card: "#FFFFFF",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://lumen.test").replace(/\/$/, "");

/** The wordmark: tracked serif with a thin gold "filament" underline. */
function wordmark(): string {
  return `
  <a href="${APP_URL}" style="text-decoration:none;color:${brand.ink};display:inline-block;">
    <span style="font-family:${brand.serif};font-size:22px;font-weight:700;letter-spacing:6px;text-transform:uppercase;">Lumen</span>
    <div style="height:2px;width:44px;margin:6px auto 0;background:${brand.gold};"></div>
  </a>`;
}

/**
 * Wrap a block of inner HTML in the standard email chrome (header wordmark +
 * card + footer). `preheader` is the hidden inbox-preview line.
 */
export function wrapEmail(inner: string, opts: { preheader: string }): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background:${brand.canvas};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${brand.canvas};">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.canvas};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:8px 0 24px;">${wordmark()}</td>
          </tr>
          <tr>
            <td style="background:${brand.card};border:1px solid ${brand.hairline};border-radius:16px;padding:40px 40px 36px;">
              ${inner}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 8px 0;font-family:${brand.sans};font-size:12px;line-height:18px;color:${brand.muted};">
              Lumen — a place to learn in the open.<br />
              <span style="color:${brand.hairline};">© ${year} Lumen LMS. All rights reserved.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** A primary call-to-action button (table-based for Outlook). */
export function button(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="border-radius:10px;background:${brand.indigo};">
        <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:${brand.sans};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function appUrl(path = ""): string {
  return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`.replace(/\/$/, "") || APP_URL;
}
