// No `import "server-only"` here, deliberately, matching every other
// module in lib/data: that guard throws when the module graph is loaded
// outside a server component, and lib/data/products.ts -- which imports
// this file -- also exports pure helpers that its own unit tests import
// directly. The guard is not what keeps costs safe in any case: cost
// prices are simply not selected anywhere in this file, and the code that
// does read them lives in lib/admin/bundles-query.ts behind requireAdminClient.
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { bundleAvailability, bundleSaving, bundleSeparateTotal, type BundleItemStock } from "@/lib/bundles";

// What the storefront needs to show one item inside a bundle: enough to
// draw the little row (name, image, colour, quantity) and enough to work
// out price and availability. Cost is NOT here -- it lives in the
// admin-only table and must never reach a customer-facing query.
export interface BundleContentItem {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image: string | null;
  colorName: string | null;
  quantity: number;
  regularPrice: number;
  salePrice: number | null;
  productStock: number;
  variantStock: number | null;
  // False when this item has been unpublished, deleted, or its pinned
  // option deactivated since the bundle was built. One of these makes
  // the whole bundle unavailable -- see lib/bundles.ts.
  isSellable: boolean;
}

export interface BundleDetail {
  bundleProductId: string;
  items: BundleContentItem[];
  // What the same items would cost separately, and the difference.
  separateTotal: number;
  // How many whole bundles can be sold right now. Worked out from the
  // items every time -- see lib/bundles.ts for why it is never stored.
  availableUnits: number;
}

// Callers that already hold a Supabase client pass it in rather than
// making a second one -- the shop grid builds every card inside one
// request and should not open another connection just for the bundles on
// the page.
export type BundleReadClient = SupabaseClient<Database>;

// One query per bundle, joined in the database rather than looped in JS:
// a bundle has 2-3 items, and a request per item would be 3 round trips
// to Tokyo for a card that is already on the page.
const ITEM_SELECT = `
  quantity,
  sort_order,
  item_product_id,
  item_variant_id,
  products!bundle_items_item_product_id_fkey ( id, name, slug, stock, status, is_deleted ),
  product_variants!bundle_items_item_variant_id_fkey ( id, color_name, regular_price, sale_price, stock, variant_image_url, is_active )
`;

type RawRow = {
  quantity: number;
  sort_order: number;
  item_product_id: string;
  item_variant_id: string;
  products: {
    id: string;
    name: string;
    slug: string;
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

function toItems(rows: RawRow[], imageByProduct: Map<string, string>): BundleContentItem[] {
  const items: BundleContentItem[] = [];
  for (const row of rows) {
    // A row whose product or option has gone missing is skipped rather
    // than rendered half-empty. The database prevents this (the foreign
    // keys are on delete restrict), so this is belt and braces.
    if (!row.products || !row.product_variants) continue;
    items.push({
      productId: row.products.id,
      variantId: row.product_variants.id,
      name: row.products.name,
      slug: row.products.slug,
      image: row.product_variants.variant_image_url ?? imageByProduct.get(row.products.id) ?? null,
      colorName: row.product_variants.color_name,
      quantity: row.quantity,
      regularPrice: row.product_variants.regular_price,
      salePrice: row.product_variants.sale_price,
      productStock: row.products.stock,
      variantStock: row.product_variants.stock,
      isSellable:
        !row.products.is_deleted &&
        row.products.status === "published" &&
        row.product_variants.is_active,
    });
  }
  return items;
}

function summarise(bundleProductId: string, items: BundleContentItem[]): BundleDetail {
  const stockShape: BundleItemStock[] = items.map((item) => ({
    productStock: item.productStock,
    variantStock: item.variantStock,
    quantity: item.quantity,
    isSellable: item.isSellable,
  }));
  return {
    bundleProductId,
    items,
    separateTotal: bundleSeparateTotal(items),
    availableUnits: bundleAvailability(stockShape),
  };
}

// Everything inside one bundle. Returns null when the product is not a
// bundle or has no contents -- callers treat that as "render it as an
// ordinary product", so a half-built bundle can never show an empty
// "what's inside" box to a customer.
export async function getBundleDetail(
  bundleProductId: string,
  client?: BundleReadClient,
): Promise<BundleDetail | null> {
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase
    .from("bundle_items")
    .select(ITEM_SELECT)
    .eq("bundle_product_id", bundleProductId)
    .order("sort_order");

  if (error || !data || data.length === 0) return null;

  const rows = data as unknown as RawRow[];
  const productIds = rows.map((r) => r.item_product_id);
  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, image_url, sort_order")
    .in("product_id", productIds)
    .order("sort_order");

  const imageByProduct = new Map<string, string>();
  for (const image of images ?? []) {
    if (!imageByProduct.has(image.product_id)) imageByProduct.set(image.product_id, image.image_url);
  }

  return summarise(bundleProductId, toItems(rows, imageByProduct));
}

// The same thing for a whole page of shop cards, in ONE query rather than
// one per card. The shop grid can hold several bundles at once and each
// needs its saving badge and its in-stock state.
export async function getBundleDetailsForProducts(
  bundleProductIds: string[],
  client?: BundleReadClient,
): Promise<Map<string, BundleDetail>> {
  const out = new Map<string, BundleDetail>();
  if (bundleProductIds.length === 0) return out;

  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("bundle_items")
    .select(`bundle_product_id, ${ITEM_SELECT}`)
    .in("bundle_product_id", bundleProductIds)
    .order("sort_order");

  if (error || !data) return out;

  const rows = data as unknown as (RawRow & { bundle_product_id: string })[];
  const productIds = [...new Set(rows.map((r) => r.item_product_id))];
  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, image_url, sort_order")
    .in("product_id", productIds)
    .order("sort_order");

  const imageByProduct = new Map<string, string>();
  for (const image of images ?? []) {
    if (!imageByProduct.has(image.product_id)) imageByProduct.set(image.product_id, image.image_url);
  }

  const grouped = new Map<string, RawRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.bundle_product_id) ?? [];
    list.push(row);
    grouped.set(row.bundle_product_id, list);
  }

  for (const [bundleId, list] of grouped) {
    out.set(bundleId, summarise(bundleId, toItems(list, imageByProduct)));
  }
  return out;
}

// Convenience for the card badge: "Save Rs 260".
export function bundleSavingFor(detail: BundleDetail, bundlePrice: number): number {
  return bundleSaving(detail.separateTotal, bundlePrice);
}
