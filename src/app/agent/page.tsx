import { getSession } from "@/lib/auth";
import { DashboardHeading } from "@/components/dashboard/stat-card";

export default async function AgentDashboard() {
  const user = await getSession();
  return (
    <div>
      <DashboardHeading title={`Welcome, ${user!.fullName}`} subtitle="Your agent workspace." />
      <p className="text-sm text-muted-foreground">Sales and commission tools appear here.</p>
    </div>
  );
}
