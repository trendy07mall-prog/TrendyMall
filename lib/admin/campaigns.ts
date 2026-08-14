"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify, formatPrice } from "@/lib/utils";
import { sriLankaInputToUtcIso } from "@/lib/campaign-datetime";
import { campaignPriceUndercuts } from "@/lib/campaign-pricing";
import { getCampaignForEdit } from "@/lib/admin/campaigns-query";
import type { CampaignPromotionType } from "@/types";

export type CampaignFormState = { error: string } | undefined;

interface SectionInput {
  clientKey: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

interface ItemInput {
  clientKey: string;
  productId: string;
  variantId: string;
  sectionClientKey: string | null;
  campaignPrice: number;
  referencePriceSnapshot: number | null;
  isActive: boolean;
  sortOrder: number;
}

const PROMO_TYPES: CampaignPromotionType[] = [
  "product_discount",
  "flash_sale",
  "free_shipping",
  "coupon",
];

// Create-or-update by presence of a hidden id, same convention as
// saveCoupon. Sections/items arrive as JSON in hidden fields (same
// pattern ProductForm.tsx already uses for variant drafts/gallery URLs)
// and are written via a delete-then-reinsert per save -- section ids
// can't survive that convention, so items reference a client-only
// sectionClientKey instead of a real section id; inserted sections are
// zipped back to their clientKey before items are written.
export async function saveCampaign(
  _prevState: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  const supabase = await requireAdminClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const promotionTypeRaw = String(formData.get("promotionType") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "").trim();
  const endAtRaw = String(formData.get("endAt") ?? "").trim();
  const status: "draft" | "published" =
    String(formData.get("status") ?? "draft") === "published" ? "published" : "draft";

  if (!name) return { error: "Name is required." };
  if (!PROMO_TYPES.includes(promotionTypeRaw as CampaignPromotionType)) {
    return { error: "Select a promotion type." };
  }
  if (!startAtRaw) return { error: "Start date/time is required." };
  const startAt = sriLankaInputToUtcIso(startAtRaw);
  if (!startAt) return { error: "Invalid start date/time." };

  let endAt: string | null = null;
  if (endAtRaw) {
    endAt = sriLankaInputToUtcIso(endAtRaw);
    if (!endAt) return { error: "Invalid end date/time." };
    if (new Date(endAt) <= new Date(startAt)) return { error: "End date must be after the start date." };
  }

  let sections: SectionInput[] = [];
  let items: ItemInput[] = [];
  try {
    sections = JSON.parse(String(formData.get("sections") ?? "[]"));
    items = JSON.parse(String(formData.get("campaignItems") ?? "[]"));
  } catch {
    return { error: "Malformed section/item data — please retry." };
  }

  if (status === "published" && items.length === 0) {
    return { error: "Add at least one product before publishing. Save as draft instead." };
  }

  // Admin-only feature, but never trust the client's own request size --
  // an unbounded insert from a scripted/forged call is cheap to guard
  // against even though a real admin session is trusted otherwise.
  if (items.length > 1000) {
    return { error: "A campaign can include at most 1000 products at once." };
  }

  // Re-validate server-side that every submitted variantId genuinely
  // belongs to its submitted productId -- never trust the client's
  // FormData for this, same principle create_order_atomic already
  // enforces for orders. Also re-checks here (not just in
  // CampaignItemsTable.tsx's client-side warning) that every campaign_price
  // actually undercuts the variant's current price -- a campaign can only
  // ever reduce price, never merely match or exceed it.
  if (items.length > 0) {
    const variantIds = [...new Set(items.map((i) => i.variantId))];
    const { data: variantRows, error: variantErr } = await supabase
      .from("product_variants")
      .select("id, product_id, color_name, regular_price, sale_price, products(name)")
      .in("id", variantIds);
    if (variantErr) return { error: variantErr.message };
    const variantById = new Map((variantRows ?? []).map((v) => [v.id, v]));
    for (const item of items) {
      const variant = variantById.get(item.variantId);
      if (!variant || variant.product_id !== item.productId) {
        return { error: "One of the selected variants no longer matches its product — please re-add it." };
      }
      if (!campaignPriceUndercuts(item.campaignPrice, variant.regular_price, variant.sale_price)) {
        const currentPrice = variant.sale_price ?? variant.regular_price;
        const productName = (variant.products as { name: string } | null)?.name ?? "a product";
        const label = variant.color_name ? `${productName} (${variant.color_name})` : productName;
        return {
          error: `Campaign price for ${label} must be lower than its current price (${formatPrice(currentPrice)}).`,
        };
      }
    }
  }

  // Phase 5: the campaign-ending-soon cron stamps ending_soon_notified_at
  // once it's emailed the owner about this campaign, so it never re-sends
  // for the same campaign every day. If this save pushes end_at back out
  // beyond that 24h window (or removes it entirely), that stamp is stale
  // -- clear it so the campaign becomes eligible to notify again near its
  // new end date. Left as `undefined` (omitted from the row entirely,
  // supabase-js drops undefined keys) when end_at is still within the
  // window, so a save mid-window can't accidentally erase a stamp the
  // cron just set.
  const endAtFarEnough = !endAt || new Date(endAt).getTime() - Date.now() > 24 * 60 * 60 * 1000;

  const row = {
    name,
    slug: slugify(slugRaw || name),
    description,
    status,
    promotion_type: promotionTypeRaw as CampaignPromotionType,
    start_at: startAt,
    end_at: endAt,
    free_shipping_enabled: formData.get("freeShippingEnabled") === "on",
    desktop_banner_url: String(formData.get("desktopBannerUrl") ?? "").trim() || null,
    mobile_banner_url: String(formData.get("mobileBannerUrl") ?? "").trim() || null,
    thumbnail_url: String(formData.get("thumbnailUrl") ?? "").trim() || null,
    show_on_homepage: formData.get("showOnHomepage") === "on",
    show_in_shop: formData.get("showInShop") === "on",
    show_badge: formData.get("showBadge") === "on",
    badge_label: String(formData.get("badgeLabel") ?? "").trim() || null,
    show_countdown: formData.get("showCountdown") === "on",
    meta_title: String(formData.get("metaTitle") ?? "").trim() || null,
    meta_description: String(formData.get("metaDescription") ?? "").trim() || null,
    og_image_url: String(formData.get("ogImageUrl") ?? "").trim() || null,
    ending_soon_notified_at: endAtFarEnough ? null : undefined,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = id
    ? await supabase.from("campaigns").update(row).eq("id", id).select("id").single()
    : await supabase.from("campaigns").insert(row).select("id").single();

  if (error || !saved) {
    if (error?.code === "23505") return { error: "A campaign with this slug already exists." };
    return { error: error?.message ?? "Could not save campaign." };
  }
  const campaignId = saved.id;

  await supabase.from("campaign_sections").delete().eq("campaign_id", campaignId);
  const keyToSectionId = new Map<string, string>();
  if (sections.length > 0) {
    const { data: insertedSections, error: sectionErr } = await supabase
      .from("campaign_sections")
      .insert(
        sections.map((s) => ({
          campaign_id: campaignId,
          name: s.name,
          sort_order: s.sortOrder,
          is_active: s.isActive,
        })),
      )
      .select("id");
    if (sectionErr) return { error: sectionErr.message };
    insertedSections?.forEach((row, i) => keyToSectionId.set(sections[i].clientKey, row.id));
  }

  await supabase.from("campaign_items").delete().eq("campaign_id", campaignId);
  if (items.length > 0) {
    const { error: itemErr } = await supabase.from("campaign_items").insert(
      items.map((it) => ({
        campaign_id: campaignId,
        section_id: it.sectionClientKey ? (keyToSectionId.get(it.sectionClientKey) ?? null) : null,
        product_id: it.productId,
        variant_id: it.variantId,
        campaign_price: it.campaignPrice,
        reference_price_snapshot: it.referencePriceSnapshot,
        is_active: it.isActive,
        sort_order: it.sortOrder,
      })),
    );
    if (itemErr) return { error: itemErr.message };
  }

  revalidatePath("/admin/campaigns");
  return undefined;
}

// Quick publish/disable from the list view, mirrors toggleCouponActive.
// No hard delete anywhere in this feature -- same "never destroy history"
// convention coupons already follow, adopted now even though nothing
// references campaigns from orders yet, so there's no rework needed once
// Phase 6 adds that FK.
export async function toggleCampaignStatus(
  id: string,
  newStatus: "draft" | "published" | "disabled",
): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/campaigns");
  return {};
}

export async function toggleCampaignArchived(id: string, isArchived: boolean): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/campaigns");
  return {};
}

// Copies structure, sections, product/variant selections, campaign prices,
// and display settings into a new campaign with a new id and slug -- dates
// and campaign prices are copied verbatim (left for the admin to adjust,
// not blanked out), status always resets to draft so a duplicate never
// goes live by accident, and there are no order references to worry about
// carrying over (this is a fresh campaign, not a snapshot of one that's
// been ordered from).
export async function duplicateCampaign(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const source = await getCampaignForEdit(id);
  if (!source) return { error: "Campaign not found." };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude from the insert payload below
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, slug, ...rest } = source.campaign;
  const baseSlug = slugify(`${slug}-copy`);

  let saved: { id: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ ...rest, slug: candidateSlug, status: "draft", updated_at: new Date().toISOString() })
      .select("id")
      .single();
    if (!error && data) {
      saved = data;
      break;
    }
    if (error && error.code !== "23505") return { error: error.message };
  }
  if (!saved) return { error: "Could not duplicate campaign — please try again." };
  const newCampaignId = saved.id;

  const keyToNewSectionId = new Map<string, string>();
  if (source.sections.length > 0) {
    const { data: insertedSections, error: sectionErr } = await supabase
      .from("campaign_sections")
      .insert(
        source.sections.map((s) => ({
          campaign_id: newCampaignId,
          name: s.name,
          sort_order: s.sort_order,
          is_active: s.is_active,
        })),
      )
      .select("id");
    if (sectionErr) return { error: sectionErr.message };
    insertedSections?.forEach((row, i) => keyToNewSectionId.set(source.sections[i].id, row.id));
  }

  if (source.items.length > 0) {
    const { error: itemErr } = await supabase.from("campaign_items").insert(
      source.items.map((item) => ({
        campaign_id: newCampaignId,
        section_id: item.section_id ? (keyToNewSectionId.get(item.section_id) ?? null) : null,
        product_id: item.product_id,
        variant_id: item.variant_id,
        campaign_price: item.campaign_price,
        discount_percentage: item.discount_percentage,
        reference_price_snapshot: item.reference_price_snapshot,
        is_active: item.is_active,
        sort_order: item.sort_order,
      })),
    );
    if (itemErr) return { error: itemErr.message };
  }

  revalidatePath("/admin/campaigns");
  return {};
}
