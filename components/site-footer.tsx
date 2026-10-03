import Link from "next/link";
import { ArrowUpRight, GraduationCap, Globe, Sprout } from "lucide-react";

const columns = [
  {
    title: "Keep learning",
    links: [
      { label: "Explore courses", href: "/course" },
      { label: "Live classes & batches", href: "/upComingBatch" },
      { label: "Find a mentor", href: "/mentorsList" },
      { label: "Community forum", href: "/forum" },
    ],
  },
  {
    title: "Get to know us",
    links: [
      { label: "About Lumen", href: "/aboutUs" },
      { label: "Careers", href: "/career" },
      { label: "Agent offices", href: "/agentOffice" },
      { label: "Become an instructor", href: "/signUp" },
    ],
  },
  {
    title: "Here to help",
    links: [
      { label: "Contact us", href: "/contactUs" },
      { label: "Verify a certificate", href: "/certificate" },
      { label: "Terms & conditions", href: "/termAndCondition" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-sidebar/50">
      <div className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 lg:px-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-heading text-2xl font-bold tracking-tight"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="size-6" />
              </span>
              <span>
                Lumen<span className="text-primary">.</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-muted-foreground">
              A little learning goes a long way. Build your next chapter with
              courses, live classes, and mentors who care.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-primary">
              <Globe className="size-4" /> Bangla-first. Open to possibility.
            </div>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider">
                {column.title}
              </h2>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Lumen. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <Sprout className="size-4 text-primary" /> A place to learn. A space
            to grow.
          </p>
        </div>
      </div>
    </footer>
  );
}
