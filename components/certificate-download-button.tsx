"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser print dialog so the certificate can be saved as PDF. */
export function CertificateDownloadButton() {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Download className="mr-2 h-4 w-4" /> Download / Print
    </Button>
  );
}
