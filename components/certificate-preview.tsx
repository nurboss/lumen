import { GraduationCap } from "lucide-react";

export interface CertLayout {
  title?: string;
  body?: string;
  signatureName?: string;
  signatureTitle?: string;
  accentColor?: string;
}

export interface CertVars {
  name: string;
  course: string;
  result: string;
  code: string;
  region: string;
  date: string;
}

// The on-brand default: pine-green ink is Lumen's primary; gold is its highlighter.
export const DEFAULT_LAYOUT: Required<CertLayout> = {
  title: "Certificate of Completion",
  body: "This certifies that {name} has successfully completed {course}, demonstrating dedication and mastery of the material.",
  signatureName: "",
  signatureTitle: "",
  accentColor: "#1e6a50",
};

// Sample data used for previews in the admin.
export const SAMPLE_VARS: CertVars = {
  name: "Ayesha Rahman",
  course: "Full-Stack Web Development",
  result: "92%",
  code: "CERT-9F3A2B7C",
  region: "Dhaka, Bangladesh",
  date: "23 Aug 2026",
};

// Fixed brand colors so the sheet is identical in light and dark themes and in print.
const PAPER = "#faf7ec";
const INK = "#28332c";
const MUTED = "#5f6e66";
const GOLD = "#c69a2b";
const GOLD_SOFT = "#e9cf86";

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

/**
 * The printable certificate artwork. Presentational and theme-independent — used
 * both on the public verification page and for previews in the admin editor.
 */
export function CertificatePreview({
  layout: partial,
  vars,
  assetUrl,
}: {
  layout: CertLayout | null | undefined;
  vars: CertVars;
  assetUrl?: string | null;
}) {
  const layout: Required<CertLayout> = { ...DEFAULT_LAYOUT, ...(partial ?? {}) };
  const accent = layout.accentColor || DEFAULT_LAYOUT.accentColor;

  return (
    <div
      className="relative aspect-[1.414/1] w-full overflow-hidden rounded-xl shadow-sm print:rounded-none print:shadow-none"
      style={{
        backgroundColor: PAPER,
        color: INK,
        border: `3px solid ${accent}`,
        backgroundImage: assetUrl ? `url(${assetUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Faint ruled-paper texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(40,51,44,0.06) 27px, rgba(40,51,44,0.06) 28px)",
        }}
      />

      {/* Inner gold hairline frame */}
      <div
        className="pointer-events-none absolute inset-3 rounded-md sm:inset-4"
        style={{ border: `1px solid ${GOLD}` }}
      />

      {/* Gold corner brackets */}
      {(
        [
          { top: 18, left: 18, bt: true, bl: true },
          { top: 18, right: 18, bt: true, br: true },
          { bottom: 18, left: 18, bb: true, bl: true },
          { bottom: 18, right: 18, bb: true, br: true },
        ] as const
      ).map((c, i) => (
        <span
          key={i}
          className="pointer-events-none absolute h-6 w-6"
          style={{
            top: "top" in c ? c.top : undefined,
            bottom: "bottom" in c ? c.bottom : undefined,
            left: "left" in c ? c.left : undefined,
            right: "right" in c ? c.right : undefined,
            borderTop: "bt" in c ? `2px solid ${GOLD}` : undefined,
            borderBottom: "bb" in c ? `2px solid ${GOLD}` : undefined,
            borderLeft: "bl" in c ? `2px solid ${GOLD}` : undefined,
            borderRight: "br" in c ? `2px solid ${GOLD}` : undefined,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative flex h-full flex-col items-center justify-center px-8 py-8 text-center sm:px-16 sm:py-10">
        {/* Brand kicker */}
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: accent }}
          >
            <GraduationCap className="h-4 w-4" style={{ color: PAPER }} />
          </span>
          <span
            className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.35em]"
            style={{ color: accent }}
          >
            Lumen Learning
          </span>
        </div>

        {/* Title */}
        <h2
          className="mt-5 font-heading text-3xl font-bold sm:text-[2.75rem] sm:leading-tight"
          style={{ color: accent, letterSpacing: "-0.02em" }}
        >
          {layout.title}
        </h2>

        {/* Gold divider with center diamond */}
        <div className="mt-3 flex items-center gap-2" aria-hidden>
          <span className="h-px w-16" style={{ backgroundColor: GOLD }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: GOLD }} />
          <span className="h-px w-16" style={{ backgroundColor: GOLD }} />
        </div>

        <p className="mt-6 text-sm sm:text-base" style={{ color: MUTED }}>
          This is proudly presented to
        </p>

        {/* Recipient with gold highlighter swipe */}
        <p
          className="mt-2 inline font-heading text-4xl font-bold sm:text-5xl"
          style={{
            color: INK,
            backgroundImage: `linear-gradient(104deg, transparent 0.5%, ${GOLD_SOFT} 1.5%, ${GOLD_SOFT} 98%, transparent 99%)`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% 40%",
            backgroundPosition: "0 88%",
            padding: "0 0.15em",
          }}
        >
          {vars.name}
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: MUTED }}>
          {fill(layout.body, vars as unknown as Record<string, string>)}
        </p>

        {/* Wax-seal medallion — carries the result */}
        <div className="mt-6 flex flex-col items-center">
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${GOLD_SOFT}, ${GOLD})`,
              boxShadow: `0 2px 8px rgba(40,51,44,0.18)`,
            }}
          >
            <span
              className="absolute inset-1.5 rounded-full"
              style={{ border: `1.5px dashed rgba(40,51,44,0.35)` }}
            />
            <div className="text-center leading-none" style={{ color: INK }}>
              <span className="block font-heading text-xl font-bold sm:text-2xl">{vars.result}</span>
              <span className="mt-0.5 block font-mono text-[0.5rem] uppercase tracking-widest">Result</span>
            </div>
          </div>
        </div>

        {/* Footer meta */}
        <div className="mt-auto grid w-full max-w-3xl grid-cols-3 items-end gap-4 pt-6 text-left">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-widest" style={{ color: MUTED }}>
              Serial number
            </p>
            <p className="font-mono text-xs font-semibold" style={{ color: INK }}>
              {vars.code}
            </p>
            <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-widest" style={{ color: MUTED }}>
              Region
            </p>
            <p className="text-xs font-semibold" style={{ color: INK }}>
              {vars.region}
            </p>
          </div>

          <div className="text-center">
            {layout.signatureName ? (
              <>
                <p
                  className="mx-auto w-40 border-t pt-1 font-heading text-sm font-semibold"
                  style={{ borderColor: "rgba(40,51,44,0.3)", color: INK }}
                >
                  {layout.signatureName}
                </p>
                {layout.signatureTitle && (
                  <p className="text-[0.65rem]" style={{ color: MUTED }}>
                    {layout.signatureTitle}
                  </p>
                )}
              </>
            ) : (
              <span
                className="mx-auto block h-px w-40"
                style={{ backgroundColor: "rgba(40,51,44,0.2)" }}
                aria-hidden
              />
            )}
          </div>

          <div className="text-right">
            <p className="font-mono text-[0.6rem] uppercase tracking-widest" style={{ color: MUTED }}>
              Issued
            </p>
            <p className="text-xs font-semibold" style={{ color: INK }}>
              {vars.date}
            </p>
            <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-widest" style={{ color: MUTED }}>
              Course
            </p>
            <p className="text-xs font-semibold" style={{ color: INK }}>
              {vars.course}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
