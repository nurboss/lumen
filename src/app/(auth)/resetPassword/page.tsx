"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { identifierSchema } from "@/lib/validators/auth";
import { postJson } from "@/lib/client-api";

type Step = "identifier" | "otp" | "password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setError(null);
    const parsed = identifierSchema.safeParse(identifier);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setLoading(true);
    const res = await postJson("/api/auth/reset_send_otp", { identifier });
    setLoading(false);
    if ("error" in res) return setError(res.error);
    setStep("otp");
  }

  async function verify() {
    setError(null);
    setLoading(true);
    const res = await postJson("/api/auth/reset_verify_otp", { identifier, code });
    setLoading(false);
    if ("error" in res) return setError(res.error);
    setStep("password");
  }

  async function submit() {
    setError(null);
    setLoading(true);
    const res = await postJson("/api/auth/reset_pass", { identifier, code, password });
    setLoading(false);
    if ("error" in res) return setError(res.error);
    router.push("/login?reset=1");
  }

  return (
    <Card>
      <CardHeader>
        <span className="eyebrow">Account recovery</span>
        <CardTitle className="font-heading text-2xl">Reset your password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "identifier" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or phone</Label>
              <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>
            <Button className="w-full" onClick={sendOtp} disabled={loading}>
              {loading ? "Sending…" : "Send reset code"}
            </Button>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="text-sm text-muted-foreground">
              If an account exists, a code was sent to <strong>{identifier}</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button className="w-full" onClick={verify} disabled={loading || code.length !== 6}>
              {loading ? "Verifying…" : "Verify"}
            </Button>
          </>
        )}

        {step === "password" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <Button className="w-full" onClick={submit} disabled={loading}>
              {loading ? "Saving…" : "Set new password"}
            </Button>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
