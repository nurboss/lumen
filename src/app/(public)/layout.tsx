import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/auth";
import { rolePrefix } from "@/components/dashboard/menu-config";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  const dashboardHref = user ? rolePrefix[user.role] ?? "/" : "/";
  const profileHref = user ? `${dashboardHref}/userProfile` : "/";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar
        user={
          user
            ? { fullName: user.fullName, avatarUrl: user.avatarUrl }
            : null
        }
        dashboardHref={dashboardHref}
        profileHref={profileHref}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
