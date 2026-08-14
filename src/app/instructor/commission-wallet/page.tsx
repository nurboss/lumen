import { getSession } from "@/lib/auth";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { WalletView } from "@/components/wallet/wallet-view";

export const dynamic = "force-dynamic";

export default async function InstructorWalletPage() {
  const user = await getSession();
  return (
    <div>
      <DashboardHeading title="Wallet" subtitle="Your earnings and withdrawals." />
      <WalletView userId={user!.id} />
    </div>
  );
}
