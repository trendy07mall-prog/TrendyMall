"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";
import type { ProductStatus } from "@/types";

export interface QuickEditPatch {
  actualPrice?: number;
  specialPrice?: number | null;
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

  if (patch.actualPrice != null && patch.actualPrice <= 0) {
    return { error: "Price must be greater than 0." };
  }
  if (patch.stock != null && patch.stock < 0) {
    return { error: "Stock can't be negative." };
  }
  if (patch.specialPrice != null && patch.actualPrice != null && patch.specialPrice >= patch.actualPrice) {
    return { error: "Special price must be less than the actual price." };
  }

  const update: Partial<{
    actual_price: number;
    special_price: number | null;
    stock: number;
    status: ProductStatus;
    is_featured: boolean;
  }> = {};
  if (patch.actualPrice != null) update.actual_price = patch.actualPrice;
  if ("specialPrice" in patch) update.special_price = patch.specialPrice;
  if (patch.stock != null) update.stock = patch.stock;
  if (patch.status) update.status = patch.status;
  if (patch.isFeatured != null) update.is_featured = patch.isFeatured;

  const { error } = await supabase.from("products").update(update).eq("id", productId);
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
      model: source.model,
      compatible_devices: source.compatible_devices,
      bluetooth: source.bluetooth,
      actual_price: source.actual_price,
      special_price: source.special_price,
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

  const [{ data: images }, { data: variants }] = await Promise.all([
    supabase
      .from("product_images")
      .select("image_url, sort_order")
      .eq("product_id", productId),
    supabase
      .from("product_variants")
      .select("color_name, color_hex, stock, variant_image_url, sort_order")
      .eq("product_id", productId),
  ]);

  if (images && images.length > 0) {
    await supabase.from("product_images").insert(
      images.map((img) => ({ ...img, product_id: inserted.id })),
    );
  }
  if (variants && variants.length > 0) {
    await supabase.from("product_variants").insert(
      variants.map((v) => ({ ...v, product_id: inserted.id })),
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
