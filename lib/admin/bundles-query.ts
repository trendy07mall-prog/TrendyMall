"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import { getAdminSearchMatchIds } from "@/lib/admin/products-query";
import {
  bundleAvailability,
  bundleProfit,
  bundleSaving,
  bundleSeparateTotal,
} from "@/lib/bundles";

// Admin-side reads for bundles. Separate from lib/data/bundles.ts on
// purpose: THIS file is allowed to touch variant_costs and therefore must
// never be imported by anything a customer can reach. The storefront file
// deliberately cannot see a cost at all.

type AdminSupabaseClient = Awaited<ReturnType<typeof requireAdminClient>>;

export interface BundlePickerVariant {
  id: string;
  colorName: string | null;
  sku: string | null;
  regularPrice: number;
  salePrice: number | null;
  stock: number | null;
  // From variant_costs. Null when nobody has entered one yet, which is
  // what makes the form's profit figure read "add cost prices" rather
  // than a number built on a guess.
  cost: number | null;
}

export interface BundlePickerProduct {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  stock: number;
  image: string | null;
  variants: BundlePickerVariant[];
}

async function primaryImages(
  supabase: AdminSupabaseClient,
  productIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (productIds.length === 0) return out;
  const { data } = await supabase
    .from("product_images")
    .select("product_id, image_url, sort_order")
    .in("product_id", productIds)
    .order("sort_order");
  for (const row of data ?? []) {
    if (!out.has(row.product_id)) out.set(row.product_id, row.image_url);
  }
  return out;
}

// What the "pick products for this bundle" search offers.
//
// Only published, non-deleted, NON-bundle products, because those are the
// only things that may legally go in a bundle -- a nested bundle would
// make stock reduction recursive, and create_order_atomic deliberately
// only looks one level deep. Filtering here means the shop owner never
// picks something the save will then reject.
export async function searchProductsForBundlePicker(
  search: string,
  limit = 12,
): Promise<BundlePickerProduct[]> {
  const supabase = await requireAdminClient();

  let query = supabase
    .from("products")
    .select("id, name, sku, brand, stock")
    .eq("is_deleted", false)
    .eq("status", "published")
    .eq("product_kind", "single")
    .order("name")
    .limit(limit);

  const trimmed = search.trim();
  if (trimmed) {
    const matchIds = await getAdminSearchMatchIds(supabase, trimmed);
    if (matchIds.length === 0) return [];
    query = query.in("id", matchIds);
  }

  const { data: products, error } = await query;
  if (error) throw error;
  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const [{ data: variantRows }, { data: costRows }, images] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, product_id, color_name, sku, regular_price, sale_price, stock")
      .in("product_id", productIds)
      .eq("is_active", true),
    supabase.from("variant_costs").select("variant_id, cost"),
    primaryImages(supabase, productIds),
  ]);

  const costByVariant = new Map((costRows ?? []).map((c) => [c.variant_id, c.cost] as const));

  const variantsByProduct = new Map<string, BundlePickerVariant[]>();
  for (const v of variantRows ?? []) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push({
      id: v.id,
      colorName: v.color_name,
      sku: v.sku,
      regularPrice: v.regular_price,
      salePrice: v.sale_price,
      stock: v.stock,
      cost: costByVariant.get(v.id) ?? null,
    });
    variantsByProduct.set(v.product_id, list);
  }

  return products.map((p) => ({
    ...p,
    image: images.get(p.id) ?? null,
    variants: variantsByProduct.get(p.id) ?? [],
  }));
}

export interface AdminBundleItem {
  productId: string;
  variantId: string;
  productName: string;
  colorName: string | null;
  quantity: number;
  regularPrice: number;
  salePrice: number | null;
  productStock: number;
  variantStock: number | null;
  cost: number | null;
  image: string | null;
  // Why this item is currently unsellable, or null when it is fine. One
  // unsellable item makes the whole bundle unavailable (sql/091), so the
  // admin has to be told which one and why -- otherwise a bundle just
  // silently reads "0" with no explanation.
  unavailableReason: string | null;
}

export interface AdminBundleRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  categoryId: string;
  description: string;
  image: string | null;
  // The bundle's selling price, off its single option.
  price: number;
  priceVariantId: string | null;
  items: AdminBundleItem[];
  separateTotal: number;
  saving: number;
  // Null when any item inside is missing a cost price -- never a guess.
  profit: number | null;
  availableUnits: number;
  // Every item that is stopping this bundle from being sold. Empty when
  // the bundle is healthy. A published bundle with entries here is the
  // case worth shouting about: it is live and cannot be fulfilled.
  blockedBy: { productName: string; reason: string }[];
}

async function hydrate(
  supabase: AdminSupabaseClient,
  bundles: { id: string; name: string; slug: string; status: string; category_id: string; description: string }[],
): Promise<AdminBundleRow[]> {
  if (bundles.length === 0) return [];
  const bundleIds = bundles.map((b) => b.id);

  const [{ data: itemRows }, { data: priceVariants }, bundleImages] = await Promise.all([
    supabase
      .from("bundle_items")
      .select(
        "bundle_product_id, item_product_id, item_variant_id, quantity, sort_order, " +
          "products!bundle_items_item_product_id_fkey ( id, name, stock, status, is_deleted ), " +
          "product_variants!bundle_items_item_variant_id_fkey ( id, color_name, regular_price, sale_price, stock, variant_image_url, is_active )",
      )
      .in("bundle_product_id", bundleIds)
      .order("sort_order"),
    supabase.from("product_variants").select("id, product_id, regular_price").in("product_id", bundleIds),
    primaryImages(supabase, bundleIds),
  ]);

  type Row = {
    bundle_product_id: string;
    item_product_id: string;
    item_variant_id: string;
    quantity: number;
    products: {
      id: string;
      name: string;
      stock: number;
      status: string;
      is_deleted: boolean;
    } | null;
    product_variants: {
      id: string;
      color_name: string | null;
      regular_price: number;
      sale_price: number | null;
      stock: number | null;
      variant_image_url: string | null;
      is_active: boolean;
    } | null;
  };
  const rows = (itemRows ?? []) as unknown as Row[];

  // Cost prices come out in one query, and only here -- this is the
  // admin-only side of the wall.
  const variantIds = rows.map((r) => r.item_variant_id);
  const { data: costRows } =
    variantIds.length > 0
      ? await supabase.from("variant_costs").select("variant_id, cost").in("variant_id", variantIds)
      : { data: [] as { variant_id: string; cost: number }[] };
  const costByVariant = new Map((costRows ?? []).map((c) => [c.variant_id, c.cost] as const));

  const itemImages = await primaryImages(supabase, [...new Set(rows.map((r) => r.item_product_id))]);

  const itemsByBundle = new Map<string, AdminBundleItem[]>();
  for (const row of rows) {
    if (!row.products || !row.product_variants) continue;
    const list = itemsByBundle.get(row.bundle_product_id) ?? [];
    list.push({
      productId: row.products.id,
      variantId: row.product_variants.id,
      productName: row.products.name,
      colorName: row.product_variants.color_name,
      quantity: row.quantity,
      regularPrice: row.product_variants.regular_price,
      salePrice: row.product_variants.sale_price,
      productStock: row.products.stock,
      variantStock: row.product_variants.stock,
      cost: costByVariant.get(row.product_variants.id) ?? null,
      image: row.product_variants.variant_image_url ?? itemImages.get(row.products.id) ?? null,
      // Worded for the shop owner, who needs to know what to go and fix,
      // not which column is false.
      unavailableReason: row.products.is_deleted
        ? "this product has been deleted"
        : row.products.status !== "published"
          ? `this product is ${row.products.status}, not published`
          : !row.product_variants.is_active
            ? "the exact option chosen for the bundle has been switched off"
            : null,
    });
    itemsByBundle.set(row.bundle_product_id, list);
  }

  const priceByBundle = new Map<string, { id: string; price: number }>();
  for (const v of priceVariants ?? []) {
    if (!priceByBundle.has(v.product_id)) priceByBundle.set(v.product_id, { id: v.id, price: v.regular_price });
  }

  return bundles.map((bundle) => {
    const items = itemsByBundle.get(bundle.id) ?? [];
    const priced = priceByBundle.get(bundle.id);
    const price = priced?.price ?? 0;
    const separateTotal = bundleSeparateTotal(items);
    return {
      id: bundle.id,
      name: bundle.name,
      slug: bundle.slug,
      status: bundle.status,
      categoryId: bundle.category_id,
      description: bundle.description,
      image: bundleImages.get(bundle.id) ?? null,
      price,
      priceVariantId: priced?.id ?? null,
      items,
      separateTotal,
      saving: bundleSaving(separateTotal, price),
      profit: bundleProfit(price, items),
      availableUnits: bundleAvailability(
        items.map((item) => ({ ...item, isSellable: item.unavailableReason === null })),
      ),
      blockedBy: items
        .filter((item) => item.unavailableReason !== null)
        .map((item) => ({ productName: item.productName, reason: item.unavailableReason! })),
    };
  });
}

export async function getAdminBundles(): Promise<AdminBundleRow[]> {
  const supabase = await requireAdminClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, status, category_id, description")
    .eq("product_kind", "bundle")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  return hydrate(supabase, data ?? []);
}

export async function getAdminBundle(id: string): Promise<AdminBundleRow | null> {
  const supabase = await requireAdminClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, status, category_id, description")
    .eq("id", id)
    .eq("product_kind", "bundle")
    .maybeSingle();
  if (!data) return null;
  const [row] = await hydrate(supabase, [data]);
  return row ?? null;
}

// The three live figures the form shows as the shop owner types. Worked
// out on the server so the cost prices never travel to the browser as a
// list -- only the totals do.
export async function quoteBundleTotals(
  items: { variantId: string; quantity: number }[],
  bundlePrice: number,
): Promise<{ separateTotal: number; saving: number; profit: number | null; availableUnits: number }> {
  const supabase = await requireAdminClient();
  if (items.length === 0) {
    return { separateTotal: 0, saving: 0, profit: null, availableUnits: 0 };
  }

  const variantIds = items.map((i) => i.variantId);
  const [{ data: variants }, { data: costs }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, product_id, regular_price, sale_price, stock, is_active, products(stock, status, is_deleted)")
      .in("id", variantIds),
    supabase.from("variant_costs").select("variant_id, cost").in("variant_id", variantIds),
  ]);

  type V = {
    id: string;
    regular_price: number;
    sale_price: number | null;
    stock: number | null;
    is_active: boolean;
    products: { stock: number; status: string; is_deleted: boolean } | null;
  };
  const byId = new Map(((variants ?? []) as unknown as V[]).map((v) => [v.id, v] as const));
  const costById = new Map((costs ?? []).map((c) => [c.variant_id, c.cost] as const));

  const priced = items.map((item) => {
    const v = byId.get(item.variantId);
    return {
      regularPrice: v?.regular_price ?? 0,
      salePrice: v?.sale_price ?? null,
      quantity: item.quantity,
      productStock: v?.products?.stock ?? 0,
      variantStock: v?.stock ?? null,
      // Same rule the database enforces (sql/091): one item that cannot
      // be sold makes the whole bundle unavailable, so the form's "can
      // sell now" figure has to say 0 rather than a cheerful number.
      isSellable:
        v != null &&
        v.products != null &&
        !v.products.is_deleted &&
        v.products.status === "published" &&
        v.is_active,
      cost: costById.get(item.variantId) ?? null,
    };
  });

  const separateTotal = bundleSeparateTotal(priced);
  return {
    separateTotal,
    saving: bundleSaving(separateTotal, bundlePrice),
    profit: bundleProfit(bundlePrice, priced),
    availableUnits: bundleAvailability(priced),
  };
}
