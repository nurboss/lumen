import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

async function verify(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim();
  if (code) redirect(`/certificate/${encodeURIComponent(code)}`);
}

export default function CertificateLookupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <span className="eyebrow">Verify</span>
      <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">Verify a certificate</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the certificate code to confirm its authenticity.
      </p>
      <Card className="mt-6">
        <CardContent className="p-6">
          <form action={verify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Certificate code</Label>
              <Input id="code" name="code" placeholder="e.g. CERT-XXXX" required />
            </div>
            <Button type="submit" className="w-full">Verify</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
