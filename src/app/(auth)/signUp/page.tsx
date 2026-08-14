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
import { cn } from "@/lib/utils";

type Step = "identifier" | "otp" | "info";
type Sector = "STUDENT" | "INSTRUCTOR" | "AGENT";

const sectors: { value: Sector; label: string; note?: string }[] = [
  { value: "STUDENT", label: "Student" },
  { value: "INSTRUCTOR", label: "Instructor", note: "Needs admin approval" },
  { value: "AGENT", label: "Agent", note: "Needs admin approval" },
];

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [sector, setSector] = useState<Sector>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setError(null);
    const parsed = identifierSchema.safeParse(identifier);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const res = await postJson("/api/auth/send_otp", { identifier });
    setLoading(false);
    if ("error" in res) return setError(res.error);
    setStep("otp");
  }

  async function verify() {
    setError(null);
    setLoading(true);
    const res = await postJson("/api/auth/verify_otp", { identifier, code });
    setLoading(false);
    if ("error" in res) return setError(res.error);
    setStep("info");
  }

  async function submit() {
    setError(null);
    setLoading(true);
    const res = await postJson<{ needsApproval: boolean; role: string }>(
      "/api/auth/register",
      { fullName, identifier, code, password, sector }
    );
    setLoading(false);
    if ("error" in res) return setError(res.error);
    if (res.data.needsApproval) {
      router.push("/login?pending=1");
    } else {
      router.push("/student");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <span className="eyebrow">
          Step {step === "identifier" ? 1 : step === "otp" ? 2 : 3} of 3
        </span>
        <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "identifier" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or phone</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or 01XXXXXXXXX"
              />
            </div>
            <Button className="w-full" onClick={sendOtp} disabled={loading}>
              {loading ? "Sending…" : "Send code"}
            </Button>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <strong>{identifier}</strong>. Check your
              server console (dev mode).
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
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={sendOtp}
            >
              Resend code
            </button>
          </>
        )}

        {step === "info" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>I am registering as</Label>
              <div className="grid grid-cols-3 gap-2">
                {sectors.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSector(s.value)}
                    className={cn(
                      "rounded-md border p-3 text-center text-sm transition-colors",
                      sector === s.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {sectors.find((s) => s.value === sector)?.note && (
                <p className="text-xs text-muted-foreground">
                  {sectors.find((s) => s.value === sector)?.note}
                </p>
              )}
            </div>
            <Button className="w-full" onClick={submit} disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </Button>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
