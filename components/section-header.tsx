import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function SectionHeader({ eyebrow, title, viewAllHref, viewAllLabel = "View all" }: SectionHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="mt-2 font-heading text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {viewAllLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
