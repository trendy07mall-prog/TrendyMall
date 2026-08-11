"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import { getAdminSearchMatchIds } from "@/lib/admin/products-query";
import { getCategories } from "@/lib/data/categories";
import type { Campaign, CampaignSection, CampaignItem, Category } from "@/types";

export interface AdminCampaignRow extends Campaign {
  itemCount: number;
}

// getCategories isn't a Server Action itself, so ProductPickerModal (a
// client component) needs this thin wrapper to populate its category filter.
export async function getCategoriesForPicker(): Promise<Category[]> {
  await requireAdminClient();
  return getCategories({ activeOnly: false });
}

// List view: item count via PostgREST's related-table count embed rather
// than a second grouped query -- there's exactly one FK from campaign_items
// to campaigns, so there's no ambiguity for PostgREST to reject.
export async function getAdminCampaigns(): Promise<AdminCampaignRow[]> {
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, campaign_items(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { campaign_items, ...campaign } = row as typeof row & {
      campaign_items: { count: number }[];
    };
    return { ...campaign, itemCount: campaign_items?.[0]?.count ?? 0 };
  });
}

export interface PickerVariant {
  id: string;
  colorName: string | null;
  sku: string | null;
  regularPrice: number;
  salePrice: number | null;
  isActive: boolean;
}

export interface PickerProduct {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  variants: PickerVariant[];
}

// Lightweight, picker-only search -- deliberately NOT getAdminProducts
// (heavyweight: full Product rows, price-range scan, campaign-price
// lookups, URL-param-driven filter state). This just needs enough to
// render checkboxes with a price next to them.
export async function searchProductsForPicker(
  search: string,
  categoryId?: string,
  limit = 10,
): Promise<PickerProduct[]> {
  const supabase = await requireAdminClient();

  let query = supabase
    .from("products")
    .select("id, name, sku, brand")
    .eq("is_deleted", false)
    .order("name")
    .limit(limit);

  const trimmed = search.trim();
  if (trimmed) {
    const matchIds = await getAdminSearchMatchIds(supabase, trimmed);
    if (matchIds.length === 0) return [];
    query = query.in("id", matchIds);
  }
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data: products, error } = await query;
  if (error) throw error;
  if (!products || products.length === 0) return [];

  const { data: variantRows, error: variantsError } = await supabase
    .from("product_variants")
    .select("id, product_id, color_name, sku, regular_price, sale_price, is_active")
    .in(
      "product_id",
      products.map((p) => p.id),
    );
  if (variantsError) throw variantsError;

  const variantsByProduct = new Map<string, PickerVariant[]>();
  for (const v of variantRows ?? []) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push({
      id: v.id,
      colorName: v.color_name,
      sku: v.sku,
      regularPrice: v.regular_price,
      salePrice: v.sale_price,
      isActive: v.is_active,
    });
    variantsByProduct.set(v.product_id, list);
  }

  return products.map((p) => ({ ...p, variants: variantsByProduct.get(p.id) ?? [] }));
}

export interface CampaignEditData {
  campaign: Campaign;
  sections: CampaignSection[];
  items: (CampaignItem & {
    product: { id: string; name: string; sku: string | null; brand: string | null };
    variant: {
      id: string;
      color_name: string | null;
      sku: string | null;
      regular_price: number;
      sale_price: number | null;
      is_active: boolean;
    };
  })[];
}

// Re-hydrates an existing campaign for the editor -- getAdminProductsByIds
// returns bare Product[] with no variant join, so this needs its own
// direct embed rather than reusing it.
export async function getCampaignForEdit(id: string): Promise<CampaignEditData | null> {
  const supabase = await requireAdminClient();
  const [{ data: campaign }, { data: sections }, { data: items }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", id).maybeSingle(),
    supabase.from("campaign_sections").select("*").eq("campaign_id", id).order("sort_order"),
    supabase
      .from("campaign_items")
      .select(
        "*, products(id, name, sku, brand), product_variants(id, color_name, sku, regular_price, sale_price, is_active)",
      )
      .eq("campaign_id", id)
      .order("sort_order"),
  ]);
  if (!campaign) return null;

  return {
    campaign,
    sections: sections ?? [],
    items: (items ?? []).map((row) => {
      const { products, product_variants, ...item } = row as typeof row & {
        products: CampaignEditData["items"][number]["product"];
        product_variants: CampaignEditData["items"][number]["variant"];
      };
      return { ...item, product: products, variant: product_variants };
    }),
  };
}
