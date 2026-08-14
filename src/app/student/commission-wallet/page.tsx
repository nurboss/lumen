import { getSession } from "@/lib/auth";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { WalletView } from "@/components/wallet/wallet-view";

export const dynamic = "force-dynamic";

export default async function StudentWalletPage() {
  const user = await getSession();
  return (
    <div>
      <DashboardHeading title="Wallet" subtitle="Your balance, commissions, and withdrawals." />
      <WalletView userId={user!.id} />
    </div>
  );
}
