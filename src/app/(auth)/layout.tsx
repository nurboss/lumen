import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="paper-lines absolute inset-0 opacity-40 pointer-events-none" />
      <div className="relative w-full max-w-md reveal">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-heading text-2xl font-bold">
          <GraduationCap className="h-8 w-8 text-primary" />
          Lumen
        </Link>
        {children}
      </div>
    </div>
  );
}
