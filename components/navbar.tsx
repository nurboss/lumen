"use client";

import Link from "next/link";
import {
  Menu,
  X,
  GraduationCap,
  Search,
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/course", label: "Courses" },
  { href: "/upComingBatch", label: "Live classes" },
  { href: "/mentorsList", label: "Mentors" },
  { href: "/forum", label: "Forum" },
];

interface NavbarUser {
  fullName: string;
  avatarUrl: string | null;
}

interface NavbarProps {
  user?: NavbarUser | null;
  dashboardHref?: string;
  profileHref?: string;
}

export function Navbar({
  user = null,
  dashboardHref = "/",
  profileHref = "/",
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const initials = user
    ? user.fullName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8 lg:px-10">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-xl font-bold"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </span>
          <span className="text-2xl tracking-tight">
            Lumen<span className="text-primary">.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Main navigation"
          className="hidden lg:flex items-center gap-1"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "px-3 py-2 text-sm font-medium hover:text-foreground transition-colors rounded-md hover:bg-secondary",
                pathname === link.href
                  ? "text-primary bg-secondary/60"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/course"
            aria-label="Search courses"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "hidden sm:inline-flex",
            )}
          >
            <Search className="h-5 w-5" />
          </Link>
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Account"
                  />
                }
              >
                <Avatar className="h-8 w-8">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{user.fullName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href={dashboardHref} />}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href={profileHref} />}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden md:inline-flex",
                )}
              >
                Login
              </Link>
              <Link
                href="/signUp"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "hidden md:inline-flex",
                )}
              >
                Get Started <ArrowUpRight className="size-3.5" />
              </Link>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-navigation"
        inert={!mobileOpen}
        className={cn(
          "lg:hidden overflow-hidden transition-all duration-300",
          mobileOpen ? "max-h-96 border-t border-border/60" : "max-h-0",
        )}
      >
        <nav
          aria-label="Mobile navigation"
          className="flex flex-col gap-1 px-4 py-3"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="mt-2 flex flex-col gap-1 border-t border-border/60 pt-3">
              <div className="flex items-center gap-2 px-3 py-2">
                <Avatar className="h-8 w-8">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.fullName}</span>
              </div>
              <Link
                href={dashboardHref}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href={profileHref}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
                onClick={() => setMobileOpen(false)}
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "flex-1",
                )}
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/signUp"
                className={cn(buttonVariants({ size: "sm" }), "flex-1")}
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
