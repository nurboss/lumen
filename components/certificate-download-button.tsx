"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";

/** One-click download of just the certificate sheet as a high-res PNG. */
export function CertificateDownloadButton({
  targetId,
  fileName,
}: {
  targetId: string;
  fileName: string;
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    const node = document.getElementById(targetId);
    if (!node) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#faf7ec",
      });
      const link = document.createElement("a");
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Fall back to the print dialog if capture is blocked (e.g. tainted image).
      window.print();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={download} disabled={busy} className="print:hidden">
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Download certificate
    </Button>
  );
}
