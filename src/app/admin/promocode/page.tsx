import prisma from "@/lib/prisma";
import { DashboardHeading } from "@/components/dashboard/stat-card";
import { PromoManager } from "@/components/admin/promo-manager";

export const dynamic = "force-dynamic";

export default async function PromoCodePage() {
  const promos = await prisma.promo.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <DashboardHeading title="Promo codes" subtitle="Create and manage discount codes." />
      <PromoManager promos={promos} />
    </div>
  );
}
