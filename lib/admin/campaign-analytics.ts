import { createClient } from "@/lib/supabase/server";
import type { FinanceRangeWindow } from "@/lib/admin/finance-shared";
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

export interface CampaignPerformanceRow {
  campaignId: string;
  campaignName: string;
  orderCount: number;
  // Net Sales is the exact, frozen figure -- the literal sum of
  // order_items.subtotal, the same column every other Finance revenue
  // number reads. Trust this one without qualification.
  netSales: number;
  // Estimated, not exact -- see the comment above getCampaignPerformance.
  // Any line whose campaign_items row (or its reference_price_snapshot) no
  // longer exists contributes to netSales but is excluded from this figure
  // rather than guessed, so estimatedDiscountGiven is always a real sum of
  // real snapshots, never a fabricated fallback.
  estimatedDiscountGiven: number;
  // "Sales" (gross, at each item's reference price) = netSales +
  // estimatedDiscountGiven -- since it's derived from the estimated figure,
  // it inherits the same "Estimated" label; netSales is the one exact number.
  estimatedGrossSales: number;
}

// Finance's "Campaign Performance" (Phase 2) -- deliberately separate from
// getRunningCampaignsWithAnalytics above, which is scoped to only
// currently-active/published campaigns for the dashboard widget. This
// covers EVERY campaign (including ended/disabled ones) that has at least
// one order_items row in the selected date range, reusing the exact same
// exclusion rule (not cancelled/returned) and the exact same frozen source
// column (order_items.subtotal) as getCampaignOrderStats above -- no second
// revenue calculation invented.
//
// "Discount given" has no dedicated stored column anywhere (campaign
// pricing is baked directly into order_items.unit_price, not a separate
// discount line the way coupons are). The closest real, frozen figure is
// campaign_items.reference_price_snapshot -- captured once, server-side,
// at the moment a product was added to the campaign (schema comment: "admin
// display only"). estimatedDiscountGiven = sum of
// (reference_price_snapshot - unit_price) * quantity across a campaign's
// lines. Both inputs are real stored values, but the snapshot reflects the
// price when the item was ADDED to the campaign, not necessarily the exact
// price at each individual purchase moment -- callers must label this
// "Estimated," never present it as an exact figure.
export async function getCampaignPerformance(
  supabase: SupabaseServerClient,
  window: FinanceRangeWindow,
): Promise<CampaignPerformanceRow[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("campaign_id, order_id, variant_id, unit_price, quantity, subtotal, orders!inner(created_at, order_status)")
    .not("campaign_id", "is", null)
    .gte("orders.created_at", window.from.toISOString())
    .lte("orders.created_at", window.to.toISOString())
    .not("orders.order_status", "in", "(cancelled,returned)");
  if (error) throw error;

  type Row = {
    campaign_id: string;
    order_id: string;
    variant_id: string | null;
    unit_price: number;
    quantity: number;
    subtotal: number;
  };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  const campaignIds = [...new Set(rows.map((r) => r.campaign_id))];
  const variantPairs = new Set(rows.filter((r) => r.variant_id).map((r) => `${r.campaign_id}:${r.variant_id}`));

  const [{ data: campaigns }, { data: campaignItems }] = await Promise.all([
    supabase.from("campaigns").select("id, name").in("id", campaignIds),
    supabase
      .from("campaign_items")
      .select("campaign_id, variant_id, reference_price_snapshot")
      .in("campaign_id", campaignIds),
  ]);

  const campaignNameById = new Map((campaigns ?? []).map((c) => [c.id, c.name] as const));
  const snapshotByPair = new Map(
    (campaignItems ?? [])
      .filter((ci) => variantPairs.has(`${ci.campaign_id}:${ci.variant_id}`))
      .map((ci) => [`${ci.campaign_id}:${ci.variant_id}`, ci.reference_price_snapshot] as const),
  );

  const orderIdsByCampaign = new Map<string, Set<string>>();
  const salesByCampaign = new Map<string, number>();
  const discountByCampaign = new Map<string, number>();

  for (const row of rows) {
    salesByCampaign.set(row.campaign_id, (salesByCampaign.get(row.campaign_id) ?? 0) + row.subtotal);

    const orderIds = orderIdsByCampaign.get(row.campaign_id) ?? new Set<string>();
    orderIds.add(row.order_id);
    orderIdsByCampaign.set(row.campaign_id, orderIds);

    const snapshot = row.variant_id ? snapshotByPair.get(`${row.campaign_id}:${row.variant_id}`) : null;
    if (snapshot != null) {
      const lineDiscount = Math.max(0, snapshot - row.unit_price) * row.quantity;
      discountByCampaign.set(row.campaign_id, (discountByCampaign.get(row.campaign_id) ?? 0) + lineDiscount);
    }
  }

  return campaignIds
    .map((campaignId) => {
      const netSales = salesByCampaign.get(campaignId) ?? 0;
      const estimatedDiscountGiven = discountByCampaign.get(campaignId) ?? 0;
      return {
        campaignId,
        campaignName: campaignNameById.get(campaignId) ?? "Deleted campaign",
        orderCount: orderIdsByCampaign.get(campaignId)?.size ?? 0,
        netSales,
        estimatedDiscountGiven,
        estimatedGrossSales: netSales + estimatedDiscountGiven,
      };
    })
    .sort((a, b) => b.netSales - a.netSales);
}
