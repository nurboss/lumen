import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const columns = [
  {
    title: "Learn",
    links: [
      { label: "Courses", href: "/course" },
      { label: "Upcoming Batches", href: "/upComingBatch" },
      { label: "Mentors", href: "/mentorsList" },
      { label: "Seminars", href: "/seminar" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/aboutUs" },
      { label: "Blog", href: "/blog" },
      { label: "Career", href: "/career" },
      { label: "Agent Offices", href: "/agentOffice" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact", href: "/contactUs" },
      { label: "Forum", href: "/forum" },
      { label: "Verify Certificate", href: "/certificate" },
      { label: "Terms", href: "/termAndCondition" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-sidebar/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold mb-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              Lumen
            </Link>
            <p className="text-sm text-muted-foreground">
              Bangla-first learning platform — courses, live classes, and mentorship.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Lumen. All rights reserved.</p>
          <p className="eyebrow">Learn with focus</p>
        </div>
      </div>
    </footer>
  );
}
