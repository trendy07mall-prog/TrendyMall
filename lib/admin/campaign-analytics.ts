import { createClient } from "@/lib/supabase/server";
import type { Campaign } from "@/types";

export interface RunningCampaign extends Campaign {
  itemCount: number;
  orderCount: number;
  revenue: number;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Same "currently active" gating as lib/data/campaigns.ts's
// getActiveCampaignsForPlacement (status='published', !is_archived,
// start_at<=now, end_at null-or-future) -- just without a placement
// (show_on_homepage/show_in_shop) filter, since this is "any campaign
// actually running right now" for admin visibility, not a storefront
// placement. No admin-side "active campaigns" query existed before this.
async function getActiveCampaigns(supabase: SupabaseServerClient): Promise<(Campaign & { itemCount: number })[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, campaign_items(count)")
    .eq("status", "published")
    .eq("is_archived", false)
    .lte("start_at", nowIso);
  if (error) throw error;

  const now = Date.now();
  const active = (data ?? [])
    .filter((row) => row.end_at == null || new Date(row.end_at).getTime() > now)
    .map((row) => {
      const { campaign_items, ...campaign } = row as typeof row & {
        campaign_items: { count: number }[];
      };
      return { ...campaign, itemCount: campaign_items?.[0]?.count ?? 0 };
    });

  return active.sort((a, b) => {
    if (a.end_at == null && b.end_at == null) return 0;
    if (a.end_at == null) return 1;
    if (b.end_at == null) return -1;
    return new Date(a.end_at).getTime() - new Date(b.end_at).getTime();
  });
}

// Implements docs/campaign-analytics-architecture.md's "Phase 10a" query
// (spec'd there, never wired up until now): order_items grouped by
// campaign_id, counting DISTINCT orders and summing subtotal, excluding
// cancelled/returned -- same exclusion the dashboard's own revenue figures
// already use. Fetches raw rows and reduces in JS (same idiom
// getCampaignSoldCounts already uses for the identical join shape) rather
// than a raw SQL group-by, since this codebase's Supabase usage never
// drops to raw SQL for aggregation.
async function getCampaignOrderStats(
  supabase: SupabaseServerClient,
  campaignIds: string[],
): Promise<Map<string, { orderCount: number; revenue: number }>> {
  const result = new Map<string, { orderCount: number; revenue: number }>();
  if (campaignIds.length === 0) return result;

  const { data, error } = await supabase
    .from("order_items")
    .select("campaign_id, order_id, subtotal, orders!inner(order_status)")
    .in("campaign_id", campaignIds)
    .not("orders.order_status", "in", "(cancelled,returned)");
  if (error) throw error;

  const orderIdsByCampaign = new Map<string, Set<string>>();
  for (const row of (data ?? []) as unknown as { campaign_id: string; order_id: string; subtotal: number }[]) {
    const stats = result.get(row.campaign_id) ?? { orderCount: 0, revenue: 0 };
    stats.revenue += row.subtotal;
    result.set(row.campaign_id, stats);

    const orderIds = orderIdsByCampaign.get(row.campaign_id) ?? new Set<string>();
    orderIds.add(row.order_id);
    orderIdsByCampaign.set(row.campaign_id, orderIds);
  }
  for (const [campaignId, orderIds] of orderIdsByCampaign) {
    const stats = result.get(campaignId);
    if (stats) stats.orderCount = orderIds.size;
  }
  return result;
}

export async function getRunningCampaignsWithAnalytics(supabase: SupabaseServerClient): Promise<RunningCampaign[]> {
  const active = await getActiveCampaigns(supabase);
  if (active.length === 0) return [];

  const stats = await getCampaignOrderStats(
    supabase,
    active.map((c) => c.id),
  );

  return active.map((campaign) => {
    const s = stats.get(campaign.id);
    return { ...campaign, orderCount: s?.orderCount ?? 0, revenue: s?.revenue ?? 0 };
  });
}
