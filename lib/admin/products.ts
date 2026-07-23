"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import DOMPurify from "isomorphic-dompurify";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";
import type { ProductStatus } from "@/types";

export type ProductFormState = { error: string } | undefined;

type AdminSupabaseClient = Awaited<ReturnType<typeof requireAdminClient>>;

interface VariantInput {
  colorName: string;
  colorHex: string;
  stock: string;
  imageUrl: string | null;
}

function parseJsonArray<T>(raw: FormDataEntryValue | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function resolveCategoryId(
  supabase: AdminSupabaseClient,
  formData: FormData,
): Promise<{ categoryId: string } | { error: string }> {
  const categoryId = String(formData.get("categoryId") ?? "");

  if (categoryId === "__new__") {
    const name = String(formData.get("newCategoryName") ?? "").trim();
    const imageUrl = String(formData.get("newCategoryImageUrl") ?? "").trim();

    if (!name) return { error: "New category name is required." };
    if (!imageUrl) return { error: "New category image is required." };

    const { data, error } = await supabase
      .from("categories")
      .insert({ slug: slugify(name), name, image_path: imageUrl })
      .select("id")
      .single();

    if (error || !data) {
      return { error: error?.message ?? "Could not create category." };
    }
    return { categoryId: data.id };
  }

  if (!categoryId) return { error: "Category is required." };
  return { categoryId };
}

function readCommonFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const description = DOMPurify.sanitize(String(formData.get("description") ?? ""));
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const model = String(formData.get("model") ?? "").trim() || null;
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const bluetooth = formData.get("bluetooth") === "on";
  const actualPrice = Number(formData.get("actualPrice") ?? 0);
  const specialPriceRaw = String(formData.get("specialPrice") ?? "").trim();
  const specialPrice = specialPriceRaw ? Number(specialPriceRaw) : null;
  const stock = Number(formData.get("stock") ?? 0);
  const status: ProductStatus =
    String(formData.get("status") ?? "draft") === "published" ? "published" : "draft";
  const isFeatured = formData.get("isFeatured") === "on";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription = String(formData.get("metaDescription") ?? "").trim() || null;
  const compatibleDevices = parseJsonArray<string>(formData.get("compatibleDevices"));
  const whatsInBox = parseJsonArray<string>(formData.get("whatsInBox"));
  const galleryImageUrls = parseJsonArray<string>(formData.get("galleryImageUrls"));
  const variants = parseJsonArray<VariantInput>(formData.get("variants"));

  return {
    name,
    slug,
    description,
    brand,
    model,
    sku,
    bluetooth,
    actualPrice,
    specialPrice,
    stock,
    status,
    isFeatured,
    metaTitle,
    metaDescription,
    compatibleDevices,
    whatsInBox,
    galleryImageUrls,
    variants,
  };
}

async function replaceProductImages(
  supabase: AdminSupabaseClient,
  productId: string,
  urls: string[],
) {
  await supabase.from("product_images").delete().eq("product_id", productId);
  if (urls.length === 0) return;

  const rows = urls.map((image_url, index) => ({
    product_id: productId,
    image_url,
    sort_order: index,
  }));
  const { error } = await supabase.from("product_images").insert(rows);
  if (error) throw new Error(error.message);
}

async function replaceProductVariants(
  supabase: AdminSupabaseClient,
  productId: string,
  variants: VariantInput[],
) {
  await supabase.from("product_variants").delete().eq("product_id", productId);

  const validVariants = variants.filter((v) => v.colorName?.trim() && v.colorHex?.trim());
  if (validVariants.length === 0) return;

  const rows = validVariants.map((v, index) => ({
    product_id: productId,
    color_name: v.colorName.trim(),
    color_hex: v.colorHex.trim(),
    stock: v.stock?.trim() ? Number(v.stock) : null,
    variant_image_url: v.imageUrl,
    sort_order: index,
  }));
  const { error } = await supabase.from("product_variants").insert(rows);
  if (error) throw new Error(error.message);
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await requireAdminClient();

  const categoryResult = await resolveCategoryId(supabase, formData);
  if ("error" in categoryResult) return { error: categoryResult.error };

  const fields = readCommonFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      slug: fields.slug,
      name: fields.name,
      description: fields.description,
      brand: fields.brand,
      model: fields.model,
      compatible_devices: fields.compatibleDevices,
      bluetooth: fields.bluetooth,
      actual_price: fields.actualPrice,
      special_price: fields.specialPrice,
      sku: fields.sku,
      whats_in_box: fields.whatsInBox,
      category_id: categoryResult.categoryId,
      stock: fields.stock,
      status: fields.status,
      is_featured: fields.isFeatured,
      meta_title: fields.metaTitle,
      meta_description: fields.metaDescription,
    })
    .select("id")
    .single();

  if (error || !product) {
    return { error: error?.message ?? "Could not create product." };
  }

  try {
    await replaceProductImages(supabase, product.id, fields.galleryImageUrls);
    await replaceProductVariants(supabase, product.id, fields.variants);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save product images/variants.",
    };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await requireAdminClient();

  const categoryResult = await resolveCategoryId(supabase, formData);
  if ("error" in categoryResult) return { error: categoryResult.error };

  const fields = readCommonFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase
    .from("products")
    .update({
      slug: fields.slug,
      name: fields.name,
      description: fields.description,
      brand: fields.brand,
      model: fields.model,
      compatible_devices: fields.compatibleDevices,
      bluetooth: fields.bluetooth,
      actual_price: fields.actualPrice,
      special_price: fields.specialPrice,
      sku: fields.sku,
      whats_in_box: fields.whatsInBox,
      category_id: categoryResult.categoryId,
      stock: fields.stock,
      status: fields.status,
      is_featured: fields.isFeatured,
      meta_title: fields.metaTitle,
      meta_description: fields.metaDescription,
    })
    .eq("id", productId);

  if (error) return { error: error.message };

  try {
    await replaceProductImages(supabase, productId, fields.galleryImageUrls);
    await replaceProductVariants(supabase, productId, fields.variants);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save product images/variants.",
    };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProduct(productId: string) {
  const supabase = await requireAdminClient();
  await supabase.from("products").delete().eq("id", productId);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}
