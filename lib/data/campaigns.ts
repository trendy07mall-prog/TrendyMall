import { createClient } from "@/lib/supabase/server";
import type { Campaign, CampaignSection } from "@/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface CampaignPriceInfo {
  campaignId: string;
  campaignPrice: number;
  // Only set when the winning campaign has show_badge=true AND a non-empty
  // badge_label -- a visibility toggle independent of pricing, so it rides
  // along with the same per-variant "lowest price wins" resolution rather
  // than filtering at the SQL level.
  badgeLabel: string | null;
  // Unconditional (unlike badgeLabel) -- name/end_at are basic facts about
  // whichever campaign is winning, not gated by any admin display toggle.
  // Free to carry along: the campaigns join already selects end_at for the
  // gating check below, this just adds one more column.
  campaignName: string;
  campaignEndAt: string | null;
}

type CampaignItemJoinRow = {
  variant_id: string;
  campaign_price: number;
  campaign_id: string;
  campaigns: {
    name: string;
    end_at: string | null;
    show_badge: boolean;
    badge_label: string | null;
  };
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
      const badgeLabel =
        row.campaigns.show_badge && row.campaigns.badge_label ? row.campaigns.badge_label : null;
      result.set(row.variant_id, {
        campaignId: row.campaign_id,
        campaignPrice: row.campaign_price,
        badgeLabel,
        campaignName: row.campaigns.name,
        campaignEndAt: row.campaigns.end_at,
      });
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
    .select(
      "variant_id, campaign_price, campaign_id, campaigns!inner(name, status, is_archived, start_at, end_at, show_badge, badge_label)",
    )
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

// A banner placement (homepage, shop, ...) needs genuinely ACTIVE campaigns
// right now (not merely "visible," the way the public RLS policy is), so
// start_at/end_at are both checked here -- a scheduled or already-ended
// campaign shouldn't occupy real estate even if flagged for this placement.
// Returns every qualifying campaign (not just one) so the caller can rotate
// through all of them -- sorted soonest-ending first, nulls (never-ending)
// last. Parameterized on which placement column to filter rather than
// duplicating this whole query per placement (homepage vs. shop today).
async function getActiveCampaignsForPlacement(
  placementField: "show_on_homepage" | "show_in_shop",
): Promise<Campaign[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq(placementField, true)
    .eq("status", "published")
    .eq("is_archived", false)
    .lte("start_at", nowIso);
  if (error) throw error;

  const now = Date.now();
  const active = (data ?? []).filter((c) => c.end_at == null || new Date(c.end_at).getTime() > now);

  return active.sort((a, b) => {
    if (a.end_at == null && b.end_at == null) return 0;
    if (a.end_at == null) return 1;
    if (b.end_at == null) return -1;
    return new Date(a.end_at).getTime() - new Date(b.end_at).getTime();
  });
}

export async function getHomepageCampaigns(): Promise<Campaign[]> {
  return getActiveCampaignsForPlacement("show_on_homepage");
}

export async function getShopCampaigns(): Promise<Campaign[]> {
  return getActiveCampaignsForPlacement("show_in_shop");
}

// Shop/category/search "On Campaign" filter -- same gating conditions as
// getActiveCampaignPricesForVariants, but returns distinct product_ids
// rather than per-variant prices, since this feeds a plain AND-narrowing
// id-list filter (like tags/attributes/price), not a price resolution.
// Takes the caller's own client (same convention as
// getActiveCampaignPricesForVariants) rather than creating a new one, since
// callers in lib/data/products.ts already have one for the same request.
export async function getActiveCampaignProductIds(
  supabase: SupabaseServerClient,
): Promise<string[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("campaign_items")
    .select("product_id, campaigns!inner(status, is_archived, start_at, end_at)")
    .eq("is_active", true)
    .eq("campaigns.status", "published")
    .eq("campaigns.is_archived", false)
    .lte("campaigns.start_at", nowIso);
  if (error) throw error;

  const now = Date.now();
  const ids = new Set<string>();
  for (const row of (data ?? []) as unknown as {
    product_id: string;
    campaigns: { end_at: string | null };
  }[]) {
    const endAt = row.campaigns.end_at;
    if (endAt != null && new Date(endAt).getTime() <= now) continue;
    ids.add(row.product_id);
  }
  return [...ids];
}

// Checkout/cart delivery-fee waiver -- same gating conditions as
// getActiveCampaignPricesForVariants, plus free_shipping_enabled, but only
// needs a yes/no answer (any qualifying campaign_item unlocks free
// shipping for the whole order), not a per-variant price map. Kept
// separate from the price-resolution functions above rather than folded
// in -- a different question with a different (boolean vs. per-variant)
// shape.
export async function hasActiveFreeShippingCampaign(
  supabase: SupabaseServerClient,
  variantIds: string[],
): Promise<boolean> {
  if (variantIds.length === 0) return false;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("campaign_items")
    .select("variant_id, campaigns!inner(status, is_archived, start_at, end_at, free_shipping_enabled)")
    .in("variant_id", variantIds)
    .eq("is_active", true)
    .eq("campaigns.status", "published")
    .eq("campaigns.is_archived", false)
    .eq("campaigns.free_shipping_enabled", true)
    .lte("campaigns.start_at", nowIso);
  if (error) throw error;

  const now = Date.now();
  return (data ?? []).some((row) => {
    const endAt = (row.campaigns as unknown as { end_at: string | null }).end_at;
    return endAt == null || new Date(endAt).getTime() > now;
  });
}

// Real, computed live per page load -- no counter to maintain (see the
// campaign-info-block plan's data audit). One batched aggregate across
// every campaign id the current page actually needs (never per-campaign),
// summed by campaign_id in JS -- this codebase's established "small store,
// aggregate in JS" convention (e.g. resolvePriceFilterProductIds). "Real
// sale" uses the exact same order_status exclusion app/admin/page.tsx's own
// revenue cards use, so a cart-added-but-never-paid line never inflates the
// count.
export async function getCampaignSoldCounts(
  supabase: SupabaseServerClient,
  campaignIds: string[],
): Promise<Map<string, number>> {
  if (campaignIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("order_items")
    .select("campaign_id, quantity, orders!inner(order_status)")
    .in("campaign_id", campaignIds)
    .not("orders.order_status", "in", "(cancelled,returned)");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as { campaign_id: string; quantity: number }[]) {
    counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + row.quantity);
  }
  return counts;
}

export interface CampaignSectionData {
  campaign: Campaign;
  productIds: string[];
}

// One batched campaign_items query across every homepage-eligible campaign
// at once (never one query per campaign) -- groups product ids by
// campaign_id, preserving the caller's campaign order. Deliberately does
// NOT hydrate products itself: that would need getProductsByIds from
// lib/data/products.ts, which already imports getActiveCampaignPricesForVariants/
// getCampaignSoldCounts from this module -- importing it back here would be
// circular. Instead this returns id groups only, exactly like
// getCampaignPageData already does for the single-campaign page, and the
// caller batch-hydrates the union of every group's productIds in one
// getProductsByIds call.
export async function getCampaignSections(campaigns: Campaign[]): Promise<CampaignSectionData[]> {
  if (campaigns.length === 0) return [];

  const supabase = await createClient();
  const campaignIds = campaigns.map((c) => c.id);
  const { data, error } = await supabase
    .from("campaign_items")
    .select("campaign_id, product_id")
    .in("campaign_id", campaignIds)
    .eq("is_active", true);
  if (error) throw error;

  const productIdsByCampaignId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = productIdsByCampaignId.get(row.campaign_id) ?? [];
    if (!list.includes(row.product_id)) list.push(row.product_id);
    productIdsByCampaignId.set(row.campaign_id, list);
  }

  return campaigns
    .map((campaign) => ({ campaign, productIds: productIdsByCampaignId.get(campaign.id) ?? [] }))
    .filter((group) => group.productIds.length > 0);
}
