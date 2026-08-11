"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";
import type { ProductStatus } from "@/types";

export interface QuickEditPatch {
  stock?: number;
  status?: ProductStatus;
  isFeatured?: boolean;
}

export type QuickEditResult = { success: true } | { error: string };

// No redirect — this runs from inline table controls, not a full-page form.
export async function quickUpdateProduct(
  productId: string,
  patch: QuickEditPatch,
): Promise<QuickEditResult> {
  const supabase = await requireAdminClient();

  if (patch.stock != null && patch.stock < 0) {
    return { error: "Stock can't be negative." };
  }

  const update: Partial<{
    stock: number;
    status: ProductStatus;
    is_featured: boolean;
  }> = {};
  if (patch.stock != null) update.stock = patch.stock;
  if (patch.status) update.status = patch.status;
  if (patch.isFeatured != null) update.is_featured = patch.isFeatured;

  const { error } = await supabase.from("products").update(update).eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  return { success: true };
}

export interface VariantPricePatch {
  regularPrice: number;
  salePrice: number | null;
}

// The inline price editor only ever applies to a single-variant product's
// one row (a multi-variant product's price is ambiguous from a flat table
// cell -- that case gets a link to the full editor instead, see
// ProductsTable.tsx). Price lives only on product_variants now, so this
// updates that row directly instead of a product-level column.
export async function quickUpdateVariantPrice(
  variantId: string,
  patch: VariantPricePatch,
): Promise<QuickEditResult> {
  const supabase = await requireAdminClient();

  if (!Number.isFinite(patch.regularPrice) || patch.regularPrice <= 0) {
    return { error: "Price must be greater than 0." };
  }
  if (patch.salePrice != null && patch.salePrice >= patch.regularPrice) {
    return { error: "Sale price must be less than the regular price." };
  }

  const { error } = await supabase
    .from("product_variants")
    .update({ regular_price: patch.regularPrice, sale_price: patch.salePrice })
    .eq("id", variantId);
  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  return { success: true };
}

// Lets staff deactivate one color/capacity without hiding the whole
// product -- every storefront query that resolves price/availability
// already filters is_active=true (getProductDetailBySlug, the shop/
// category/search card query, price/on-sale facets, cart recommendations),
// so flipping this is enough on its own: the variant simply stops
// existing in any of those result sets. create_order_atomic also
// re-checks is_active at order-creation time, so a stale client can't
// buy a deactivated variant either way.
export async function quickUpdateVariantActive(
  variantId: string,
  isActive: boolean,
): Promise<QuickEditResult> {
  const supabase = await requireAdminClient();

  const { error } = await supabase
    .from("product_variants")
    .update({ is_active: isActive })
    .eq("id", variantId);
  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  return { success: true };
}

export type DuplicateResult = { newProductId: string } | { error: string };

async function duplicateOne(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  productId: string,
): Promise<DuplicateResult> {
  const { data: source, error: sourceError } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (sourceError) return { error: sourceError.message };
  if (!source) return { error: "Product not found." };

  const { data: existingSlugs } = await supabase.from("products").select("slug");
  const slugSet = new Set((existingSlugs ?? []).map((p) => p.slug));
  let slug = slugify(`${source.name} copy`);
  let suffix = 2;
  while (slugSet.has(slug)) {
    slug = `${slugify(`${source.name} copy`)}-${suffix}`;
    suffix += 1;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("products")
    .insert({
      slug,
      name: `${source.name} (Copy)`,
      description: source.description,
      brand: source.brand,
      brand_id: source.brand_id,
      sku: source.sku,
      whats_in_box: source.whats_in_box,
      category_id: source.category_id,
      stock: source.stock,
      // Never publish a duplicate automatically — the admin should review
      // it (name, price, images) before it goes live.
      status: "draft",
      is_featured: false,
      meta_title: source.meta_title,
      meta_description: source.meta_description,
      keywords: source.keywords,
      cod_available: source.cod_available,
      free_delivery: source.free_delivery,
      warranty_available: source.warranty_available,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Could not duplicate product." };
  }

  const [{ data: images }, { data: variants }, { data: productTags }, { data: specValues }, { data: attributeValues }] =
    await Promise.all([
      supabase
        .from("product_images")
        .select("image_url, sort_order")
        .eq("product_id", productId),
      // Every column a variant needs to stay fully priced/identified in the
      // duplicate -- regular_price/sale_price/sku/is_default were
      // previously missing here, silently leaving a duplicated product's
      // variants unpriced (a pre-existing gap, fixed while touching this
      // function for the pricing migration).
      supabase
        .from("product_variants")
        .select("color_name, color_hex, stock, regular_price, sale_price, sku, is_default, is_active, variant_image_url, sort_order")
        .eq("product_id", productId),
      supabase.from("product_tags").select("tag_id").eq("product_id", productId),
      supabase.from("product_spec_values").select("spec_field_id, value").eq("product_id", productId),
      supabase.from("product_attribute_values").select("attribute_value_id").eq("product_id", productId),
    ]);

  if (images && images.length > 0) {
    await supabase.from("product_images").insert(
      images.map((img) => ({ ...img, product_id: inserted.id })),
    );
  }
  if (variants && variants.length > 0) {
    await supabase.from("product_variants").insert(
      // sku is explicitly dropped, not copied -- product_variants_sku_key
      // is a real unique index (sql/051), so copying it verbatim would
      // fail the insert outright rather than silently duplicate it.
      variants.map((v) => ({ ...v, sku: null, product_id: inserted.id })),
    );
  }
  if (productTags && productTags.length > 0) {
    await supabase.from("product_tags").insert(
      productTags.map((t) => ({ tag_id: t.tag_id, product_id: inserted.id })),
    );
  }
  if (specValues && specValues.length > 0) {
    await supabase.from("product_spec_values").insert(
      specValues.map((v) => ({ spec_field_id: v.spec_field_id, value: v.value, product_id: inserted.id })),
    );
  }
  if (attributeValues && attributeValues.length > 0) {
    await supabase.from("product_attribute_values").insert(
      attributeValues.map((v) => ({ attribute_value_id: v.attribute_value_id, product_id: inserted.id })),
    );
  }

  return { newProductId: inserted.id };
}

export async function duplicateProduct(productId: string): Promise<DuplicateResult> {
  const supabase = await requireAdminClient();
  const result = await duplicateOne(supabase, productId);
  revalidatePath("/admin/products");
  return result;
}

// Soft-deletes a single product without redirecting — for the table's
// inline row actions, which need to stay on the current filtered/paginated
// view. lib/admin/products.ts's deleteProduct is the redirecting version,
// still used by the edit page's own delete button (where navigating back
// to the list after deleting makes sense).
export async function deleteProductInline(productId: string): Promise<QuickEditResult> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_deleted: true })
    .eq("id", productId);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export interface BulkResult {
  successCount: number;
  errors: string[];
}

export async function bulkUpdateStatus(
  productIds: string[],
  status: ProductStatus,
): Promise<BulkResult> {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("products").update({ status }).in("id", productIds);

  revalidatePath("/admin/products");
  if (error) return { successCount: 0, errors: [error.message] };
  return { successCount: productIds.length, errors: [] };
}

export async function bulkSoftDelete(productIds: string[]): Promise<BulkResult> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_deleted: true })
    .in("id", productIds);

  revalidatePath("/admin/products");
  if (error) return { successCount: 0, errors: [error.message] };
  return { successCount: productIds.length, errors: [] };
}

export async function bulkRestore(productIds: string[]): Promise<BulkResult> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_deleted: false })
    .in("id", productIds);

  revalidatePath("/admin/products");
  if (error) return { successCount: 0, errors: [error.message] };
  return { successCount: productIds.length, errors: [] };
}

export async function bulkDuplicate(productIds: string[]): Promise<BulkResult> {
  const supabase = await requireAdminClient();
  const errors: string[] = [];
  let successCount = 0;

  for (const id of productIds) {
    const result = await duplicateOne(supabase, id);
    if ("error" in result) errors.push(result.error);
    else successCount += 1;
  }

  revalidatePath("/admin/products");
  return { successCount, errors };
}
