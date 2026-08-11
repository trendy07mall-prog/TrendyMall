"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";
import { sriLankaInputToUtcIso } from "@/lib/campaign-datetime";
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

  // Re-validate server-side that every submitted variantId genuinely
  // belongs to its submitted productId -- never trust the client's
  // FormData for this, same principle create_order_atomic already
  // enforces for orders.
  if (items.length > 0) {
    const variantIds = [...new Set(items.map((i) => i.variantId))];
    const { data: variantRows, error: variantErr } = await supabase
      .from("product_variants")
      .select("id, product_id")
      .in("id", variantIds);
    if (variantErr) return { error: variantErr.message };
    const ownerByVariant = new Map((variantRows ?? []).map((v) => [v.id, v.product_id]));
    for (const item of items) {
      if (ownerByVariant.get(item.variantId) !== item.productId) {
        return { error: "One of the selected variants no longer matches its product — please re-add it." };
      }
    }
  }

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
