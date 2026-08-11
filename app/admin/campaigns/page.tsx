import { getAdminCampaigns } from "@/lib/admin/campaigns-query";
import { CampaignsManager } from "@/components/admin/CampaignsManager";

export default async function AdminCampaignsPage() {
  const campaigns = await getAdminCampaigns();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Campaigns</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Product discounts, flash sales, and other promotions. Storefront pricing is always
        computed server-side; this only controls what&apos;s advertised.
      </p>
      <div className="mt-6">
        <CampaignsManager campaigns={campaigns} />
      </div>
    </div>
  );
}
