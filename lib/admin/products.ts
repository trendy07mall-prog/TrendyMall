"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";
import { requireAdminClient } from "@/lib/admin/guard";
import { setProductTags } from "@/lib/admin/tags";
import { setProductSpecValues } from "@/lib/admin/spec-templates";
import { setProductAttributeValues } from "@/lib/admin/attributes";
import { slugify } from "@/lib/utils";
import type { ProductStatus } from "@/types";

export type ProductFormState = { error: string } | undefined;

// Allowlist matches exactly what the Tiptap editor's StarterKit + Image
// extensions can produce (bold/italic/lists/headings/blockquote/inline
// images) — anything else (scripts, event handlers, iframes, etc.) is
// stripped. Uses sanitize-html rather than isomorphic-dompurify: the latter
// depends on jsdom, which fails to load in Vercel's serverless bundling
// (ERR_REQUIRE_ESM) and crashed every page that references these Server
// Actions, not just the ones that submit the form.
const DESCRIPTION_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "s", "code", "pre", "blockquote", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "img",
  ],
  allowedAttributes: { img: ["src", "alt"] },
};

type AdminSupabaseClient = Awaited<ReturnType<typeof requireAdminClient>>;

interface VariantInput {
  // Present only for a variant that already exists in the DB (populated
  // when editing a product) -- omitted for a brand-new row added in this
  // save. This is what lets syncProductVariants update in place instead of
  // deleting and reinserting with a fresh id every save.
  id?: string;
  colorName: string;
  colorHex: string;
  stock: string;
  price: string;
  sku: string;
  imageUrls: string[];
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

// Brand is optional (unlike category) -- an empty selection is valid and
// resolves to no brand at all, not an error. Resolves to both the brand's
// id (the real FK, `brand_id`) and its name (kept as the legacy `brand`
// text column so every existing reader -- ProductCard, SpecsTable, PDP
// JSON-LD, CSV export -- stays correct without being touched this stage).
async function resolveBrandId(
  supabase: AdminSupabaseClient,
  formData: FormData,
): Promise<{ brandId: string | null; brandName: string | null } | { error: string }> {
  const brandId = String(formData.get("brandId") ?? "");

  if (brandId === "__new__") {
    const name = String(formData.get("newBrandName") ?? "").trim();
    if (!name) return { error: "New brand name is required." };

    const { data, error } = await supabase
      .from("brands")
      .insert({ slug: slugify(name), name })
      .select("id, name")
      .single();

    if (error || !data) {
      return { error: error?.message ?? "Could not create brand." };
    }
    return { brandId: data.id, brandName: data.name };
  }

  if (!brandId) return { brandId: null, brandName: null };

  const { data, error } = await supabase.from("brands").select("name").eq("id", brandId).maybeSingle();
  if (error || !data) return { error: "Selected brand could not be found." };
  return { brandId, brandName: data.name };
}

// The resolved category's assigned spec template (if any) determines which
// `specValue_<fieldId>` form fields exist -- read dynamically rather than a
// fixed list, mirroring how SpecFieldsEditor renders them dynamically too.
async function resolveSpecValues(
  supabase: AdminSupabaseClient,
  categoryId: string,
  formData: FormData,
): Promise<{ fieldId: string; value: string }[]> {
  const { data: category } = await supabase
    .from("categories")
    .select("spec_template_id")
    .eq("id", categoryId)
    .maybeSingle();

  if (!category?.spec_template_id) return [];

  const { data: fields } = await supabase
    .from("spec_fields")
    .select("id")
    .eq("template_id", category.spec_template_id);

  return (fields ?? []).map((field) => ({
    fieldId: field.id,
    value: String(formData.get(`specValue_${field.id}`) ?? ""),
  }));
}

function readCommonFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const description = sanitizeHtml(
    String(formData.get("description") ?? ""),
    DESCRIPTION_SANITIZE_OPTIONS,
  );
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const actualPrice = Number(formData.get("actualPrice") ?? 0);
  const specialPriceRaw = String(formData.get("specialPrice") ?? "").trim();
  const specialPrice = specialPriceRaw ? Number(specialPriceRaw) : null;
  const stock = Number(formData.get("stock") ?? 0);
  const status: ProductStatus =
    String(formData.get("status") ?? "draft") === "published" ? "published" : "draft";
  const isFeatured = formData.get("isFeatured") === "on";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription = String(formData.get("metaDescription") ?? "").trim() || null;
  const keywords = String(formData.get("keywords") ?? "").trim() || null;
  const codAvailable = formData.get("codAvailable") === "on";
  const freeDelivery = formData.get("freeDelivery") === "on";
  const warrantyAvailable = formData.get("warrantyAvailable") === "on";
  const whatsInBox = parseJsonArray<string>(formData.get("whatsInBox"));
  const galleryImageUrls = parseJsonArray<string>(formData.get("galleryImageUrls"));
  const variants = parseJsonArray<VariantInput>(formData.get("variants"));
  const tagIds = formData.getAll("tagIds").map(String);
  const attributeValueIds = formData.getAll("attributeValueIds").map(String);

  return {
    name,
    slug,
    description,
    sku,
    actualPrice,
    specialPrice,
    stock,
    status,
    isFeatured,
    metaTitle,
    metaDescription,
    keywords,
    codAvailable,
    freeDelivery,
    warrantyAvailable,
    whatsInBox,
    galleryImageUrls,
    tagIds,
    attributeValueIds,
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

// Up to 4 images per variant. Delete-then-reinsert (unlike the variant row
// itself) is fine here -- these are plain display assets with no external
// FK referencing a specific image row, so there's no stable-identity
// concern the way there is for product_variants.id.
async function replaceVariantImages(
  supabase: AdminSupabaseClient,
  variantId: string,
  urls: string[],
) {
  await supabase.from("product_variant_images").delete().eq("variant_id", variantId);
  if (urls.length === 0) return;

  const rows = urls.slice(0, 4).map((image_url, index) => ({
    variant_id: variantId,
    image_url,
    sort_order: index,
  }));
  const { error } = await supabase.from("product_variant_images").insert(rows);
  if (error) throw new Error(error.message);
}

// Stable-identity sync, not delete-then-reinsert: a variant's id has to
// survive an unrelated product edit (a price tweak, a description fix)
// now that cart_items/order_items can reference it. Deleting and
// reinserting with a fresh uuid every save would silently orphan every
// customer's in-progress cart line and every historical order reference
// pointing at the old id.
async function syncProductVariants(
  supabase: AdminSupabaseClient,
  productId: string,
  variants: VariantInput[],
) {
  // A row that's genuinely blank (never touched after "+ Add color
  // variant") is silently dropped, same as before -- but a row with SOME
  // field filled in that's still missing colorName/colorHex must not be
  // silently discarded, or the admin has no way to know why their variant
  // vanished after saving.
  const incomplete = variants.filter(
    (v) =>
      !(v.colorName?.trim() && v.colorHex?.trim()) &&
      (v.colorName?.trim() || v.stock?.trim() || v.price?.trim() || v.sku?.trim() || v.imageUrls?.length),
  );
  if (incomplete.length > 0) {
    throw new Error(
      "Every color variant needs both a color name and a color swatch before it can be saved.",
    );
  }

  const validVariants = variants.filter((v) => v.colorName?.trim() && v.colorHex?.trim());

  const { data: existingRows, error: existingError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);
  if (existingError) throw new Error(existingError.message);
  const existingIds = new Set((existingRows ?? []).map((r) => r.id));

  const toUpdate = validVariants.filter((v) => v.id && existingIds.has(v.id));
  const toInsert = validVariants.filter((v) => !v.id || !existingIds.has(v.id));
  const keepIds = new Set(toUpdate.map((v) => v.id));
  const toDeleteIds = [...existingIds].filter((id) => !keepIds.has(id));

  if (toDeleteIds.length > 0) {
    const { error } = await supabase.from("product_variants").delete().in("id", toDeleteIds);
    if (error) throw new Error(error.message);
  }

  for (const [index, v] of validVariants.entries()) {
    // Never trust the client's array length -- cap at 4 server-side
    // regardless of what the form actually submitted.
    const imageUrls = (v.imageUrls ?? []).slice(0, 4);
    const row = {
      color_name: v.colorName.trim(),
      color_hex: v.colorHex.trim(),
      stock: v.stock?.trim() ? Number(v.stock) : null,
      price: v.price?.trim() ? Number(v.price) : null,
      sku: v.sku?.trim() || null,
      variant_image_url: imageUrls[0] ?? null,
      sort_order: index,
    };
    if (toUpdate.includes(v)) {
      const { error } = await supabase.from("product_variants").update(row).eq("id", v.id!);
      if (error) throw new Error(error.message);
      await replaceVariantImages(supabase, v.id!, imageUrls);
    } else if (toInsert.includes(v)) {
      const { data: inserted, error } = await supabase
        .from("product_variants")
        .insert({ ...row, product_id: productId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await replaceVariantImages(supabase, inserted.id, imageUrls);
    }
  }
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await requireAdminClient();

  const categoryResult = await resolveCategoryId(supabase, formData);
  if ("error" in categoryResult) return { error: categoryResult.error };

  const brandResult = await resolveBrandId(supabase, formData);
  if ("error" in brandResult) return { error: brandResult.error };

  const fields = readCommonFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const specValues = await resolveSpecValues(supabase, categoryResult.categoryId, formData);

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      slug: fields.slug,
      name: fields.name,
      description: fields.description,
      brand: brandResult.brandName,
      brand_id: brandResult.brandId,
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
      keywords: fields.keywords,
      cod_available: fields.codAvailable,
      free_delivery: fields.freeDelivery,
      warranty_available: fields.warrantyAvailable,
    })
    .select("id")
    .single();

  if (error || !product) {
    return { error: error?.message ?? "Could not create product." };
  }

  try {
    await replaceProductImages(supabase, product.id, fields.galleryImageUrls);
    await syncProductVariants(supabase, product.id, fields.variants);
    await setProductTags(supabase, product.id, fields.tagIds);
    await setProductSpecValues(supabase, product.id, specValues);
    await setProductAttributeValues(supabase, product.id, fields.attributeValueIds);
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

  const brandResult = await resolveBrandId(supabase, formData);
  if ("error" in brandResult) return { error: brandResult.error };

  const fields = readCommonFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const specValues = await resolveSpecValues(supabase, categoryResult.categoryId, formData);

  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  if (existing && existing.slug !== fields.slug) {
    // Best-effort: an old link continuing to 404 isn't worth failing the
    // whole product update over.
    await supabase
      .from("product_slug_redirects")
      .insert({ old_slug: existing.slug, product_id: productId });
  }

  const { error } = await supabase
    .from("products")
    .update({
      slug: fields.slug,
      name: fields.name,
      description: fields.description,
      brand: brandResult.brandName,
      brand_id: brandResult.brandId,
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
      keywords: fields.keywords,
      cod_available: fields.codAvailable,
      free_delivery: fields.freeDelivery,
      warranty_available: fields.warrantyAvailable,
    })
    .eq("id", productId);

  if (error) return { error: error.message };

  try {
    await replaceProductImages(supabase, productId, fields.galleryImageUrls);
    await syncProductVariants(supabase, productId, fields.variants);
    await setProductTags(supabase, productId, fields.tagIds);
    await setProductSpecValues(supabase, productId, specValues);
    await setProductAttributeValues(supabase, productId, fields.attributeValueIds);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save product images/variants.",
    };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

// Soft delete only — never a hard DELETE. order_items.product_name/
// unit_price/product_image_url are already snapshotted at order time, but
// product_id stays a live FK, and product_sales_summary/product_rating_summary
// join on it — a hard delete would null that out and silently drop the
// product from those aggregates for every past order.
export async function deleteProduct(productId: string) {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_deleted: true })
    .eq("id", productId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
