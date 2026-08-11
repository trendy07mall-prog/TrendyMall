import { createClient } from "@/lib/supabase/server";
import type { Campaign, CampaignSection } from "@/types";

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

export interface CampaignSectionGroup {
  section: CampaignSection | null;
  productIds: string[];
}

export interface CampaignPageData {
  campaign: Campaign;
  groups: CampaignSectionGroup[];
}

// Public storefront lookup for /campaign/[slug] -- a plain (non-admin)
// client naturally gets `null` here for anything not published (RLS), and
// an admin's own session naturally gets the row back for a draft/disabled
// campaign (RLS's is_admin() bypass) -- no parallel admin check needed.
// is_archived is deliberately NOT RLS-gated (so countdown banners can read
// a not-yet-started campaign, per the schema's own design), so it's
// enforced here instead: an archived campaign always 404s, even for an
// admin, keeping this route simple (the editor is where an admin inspects
// an archived campaign's content, not this live URL).
export async function getCampaignPageData(slug: string): Promise<CampaignPageData | null> {
  const supabase = await createClient();
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!campaign || campaign.is_archived) return null;

  const [{ data: sections, error: sectionsError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from("campaign_sections")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("campaign_items")
      .select("product_id, section_id")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  if (sectionsError) throw sectionsError;
  if (itemsError) throw itemsError;

  const productIdsBySectionId = new Map<string | null, string[]>();
  for (const item of items ?? []) {
    const list = productIdsBySectionId.get(item.section_id) ?? [];
    if (!list.includes(item.product_id)) list.push(item.product_id);
    productIdsBySectionId.set(item.section_id, list);
  }

  const groups: CampaignSectionGroup[] = [];
  for (const section of sections ?? []) {
    const productIds = productIdsBySectionId.get(section.id);
    if (productIds && productIds.length > 0) groups.push({ section, productIds });
  }
  const unsectioned = productIdsBySectionId.get(null);
  if (unsectioned && unsectioned.length > 0) groups.push({ section: null, productIds: unsectioned });

  return { campaign, groups };
}

// Sitemap only -- pushes status/is_archived to SQL, then excludes truly
// ended campaigns (end_at in the past) in JS, same nullable-OR split
// getActiveCampaignPricesForVariants already established. Scheduled
// (not-yet-started) campaigns ARE included -- they're legitimately about
// to go live.
export async function getAllCampaignSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("slug, end_at")
    .eq("status", "published")
    .eq("is_archived", false);
  if (error) throw error;

  const now = Date.now();
  return (data ?? [])
    .filter((c) => c.end_at == null || new Date(c.end_at).getTime() > now)
    .map((c) => c.slug);
}
