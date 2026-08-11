import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface CampaignPriceInfo {
  campaignId: string;
  campaignPrice: number;
}

type CampaignItemJoinRow = {
  variant_id: string;
  campaign_price: number;
  campaign_id: string;
  campaigns: { end_at: string | null };
};

// Pure, DB-free: "lowest campaign_price wins" across possibly-multiple
// simultaneously-active campaigns on the same variant, plus the end_at
// nullable-OR check the query itself doesn't push down to SQL (start_at and
// every other gating condition ARE pushed to SQL by the caller below --
// this only needs to re-check end_at, and pick the minimum price per
// variant). Split out from the query specifically so this branching logic
// is unit-testable without a live Supabase client.
export function selectLowestActiveCampaignPrices(
  rows: CampaignItemJoinRow[],
  now: Date = new Date(),
): Map<string, CampaignPriceInfo> {
  const result = new Map<string, CampaignPriceInfo>();
  for (const row of rows) {
    const endAt = row.campaigns.end_at;
    if (endAt != null && new Date(endAt).getTime() <= now.getTime()) continue;
    const existing = result.get(row.variant_id);
    if (!existing || row.campaign_price < existing.campaignPrice) {
      result.set(row.variant_id, { campaignId: row.campaign_id, campaignPrice: row.campaign_price });
    }
  }
  return result;
}

// The ONE place "what's this variant's active campaign price, if any" is
// computed -- every storefront/cart/admin surface that needs a
// campaign-aware price calls this once, batched across every variant id it
// already has, and spreads the result onto its own variant rows rather than
// re-deriving the gating conditions itself. Never call this in a
// per-product or per-item loop -- always batch every variant id for the
// whole request into one call.
//
// Gating (status/is_archived/start_at/end_at/campaign_items.is_active) is
// enforced HERE, in application code, not left to RLS -- campaigns' public
// RLS policy deliberately omits is_archived/start_at (so countdown banners
// can show a not-yet-started campaign), and its is_admin() bypass means an
// admin's own storefront session gets NO row filtering at all from RLS.
export async function getActiveCampaignPricesForVariants(
  supabase: SupabaseServerClient,
  variantIds: string[],
): Promise<Map<string, CampaignPriceInfo>> {
  if (variantIds.length === 0) return new Map();

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("campaign_items")
    .select("variant_id, campaign_price, campaign_id, campaigns!inner(status, is_archived, start_at, end_at)")
    .in("variant_id", variantIds)
    .eq("is_active", true)
    .eq("campaigns.status", "published")
    .eq("campaigns.is_archived", false)
    .lte("campaigns.start_at", nowIso);
  if (error) throw error;

  return selectLowestActiveCampaignPrices((data ?? []) as unknown as CampaignItemJoinRow[]);
}

// Today's exact sale-or-regular logic, named for reuse outside price
// resolution -- e.g. the admin campaign-item editor's "warn if this
// campaign_price doesn't actually undercut the current price" validation,
// which needs the NON-campaign-aware price without importing
// getVariantPrice's campaign-aware overload.
export function getBasePrice(variant: { regular_price: number; sale_price: number | null }): number {
  return variant.sale_price ?? variant.regular_price;
}
