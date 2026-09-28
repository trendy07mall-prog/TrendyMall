"use server";

import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireAdminClient } from "@/lib/admin/guard";

// A bundle is a products row with product_kind = 'bundle' plus exactly one
// option carrying the bundle price, plus bundle_items saying what is
// inside. Creating one therefore writes three things, and this file is the
// only place that knows that -- see sql/085 for why the feature is shaped
// this way.

export type BundleFormState = { error: string } | { ok: true; bundleId: string } | undefined;

// The brief describes 2-3 products. The minimum is enforced because a
// "bundle" of one is just a product with a second price, which would be a
// confusing thing to have in the catalogue. The maximum is a sanity cap
// rather than a rule from the brief -- raise it here if a bigger bundle is
// ever wanted.
const MIN_ITEMS = 2;
const MAX_ITEMS = 5;

interface PickedItem {
  productId: string;
  variantId: string;
  quantity: number;
}

// The form posts items as a JSON array so the picker can send product,
// option and quantity together without inventing a naming scheme for
// repeated form fields.
function readItems(formData: FormData): PickedItem[] | { error: string } {
  const raw = String(formData.get("items") ?? "").trim();
  if (!raw) return { error: "Pick at least two products for the bundle." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "The chosen products could not be read. Please re-pick them." };
  }
  if (!Array.isArray(parsed)) return { error: "The chosen products could not be read." };

  const items: PickedItem[] = [];
  for (const entry of parsed) {
    const productId = String((entry as PickedItem)?.productId ?? "").trim();
    const variantId = String((entry as PickedItem)?.variantId ?? "").trim();
    const quantity = Number((entry as PickedItem)?.quantity ?? 0);
    if (!productId || !variantId) return { error: "Every item needs a product and an option chosen." };
    if (!Number.isInteger(quantity) || quantity < 1) return { error: "Every item needs a quantity of at least 1." };
    items.push({ productId, variantId, quantity });
  }

  if (items.length < MIN_ITEMS) return { error: `A bundle needs at least ${MIN_ITEMS} products.` };
  if (items.length > MAX_ITEMS) return { error: `A bundle can hold at most ${MAX_ITEMS} products.` };

  const seen = new Set(items.map((i) => i.variantId));
  if (seen.size !== items.length) {
    return { error: "The same option is in the bundle twice. Use the quantity box instead." };
  }
  return items;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type AdminClient = Awaited<ReturnType<typeof requireAdminClient>>;

// Every item must be a real, published, NON-bundle product. The last part
// matters: a bundle inside a bundle would make stock reduction recursive,
// and create_order_atomic deliberately only looks one level deep.
async function validateItems(
  supabase: AdminClient,
  items: PickedItem[],
): Promise<{ error: string } | { ok: true }> {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name, status, is_deleted, product_kind")
    .in("id", productIds);

  for (const item of items) {
    const product = (products ?? []).find((p) => p.id === item.productId);
    if (!product || product.is_deleted) return { error: "One of the chosen products no longer exists." };
    if (product.product_kind === "bundle") {
      return { error: `"${product.name}" is itself a bundle. A bundle cannot contain another bundle.` };
    }
    if (product.status !== "published") {
      return { error: `"${product.name}" is not published, so it cannot go in a bundle yet.` };
    }
  }

  const variantIds = items.map((i) => i.variantId);
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, is_active")
    .in("id", variantIds);

  for (const item of items) {
    const variant = (variants ?? []).find((v) => v.id === item.variantId);
    if (!variant || !variant.is_active) return { error: "One of the chosen options is no longer available." };
    if (variant.product_id !== item.productId) {
      return { error: "One of the chosen options does not belong to its product." };
    }
  }
  return { ok: true };
}

function revalidateBundle(slug?: string) {
  // Bundles are products, so they live behind the same cache tag.
  updateTag(CACHE_TAGS.products);
  revalidatePath("/admin/bundles");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  if (slug) revalidatePath(`/product/${slug}`);
}

export async function saveBundle(
  _prevState: BundleFormState,
  formData: FormData,
): Promise<BundleFormState> {
  const supabase = await requireAdminClient();

  const bundleId = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const priceRaw = String(formData.get("price") ?? "").trim();
  const publish = formData.get("publish") === "true";

  if (!name) return { error: "Give the bundle a name." };

  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a bundle price greater than zero." };

  const items = readItems(formData);
  if ("error" in items) return items;

  const valid = await validateItems(supabase, items);
  if ("error" in valid) return valid;

  // A bundle still needs a category, because products.category_id is
  // required and the whole point is that a bundle IS a product. The form
  // sends one; this is the guard for a malformed post.
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) return { error: "Choose a category for the bundle." };

  const status = publish ? "published" : "draft";

  let id = bundleId;
  if (id) {
    const { error } = await supabase
      .from("products")
      .update({ name, description, status, category_id: categoryId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("product_kind", "bundle"); // never let this path edit a normal product
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        name,
        description,
        category_id: categoryId,
        product_kind: "bundle",
        status,
        // Never read for a bundle: availability comes from the items.
        // Zero is the honest value for "this number means nothing here".
        stock: 0,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    id = data.id;
  }

  // The single option that carries the price. One per bundle, always.
  const { data: existingVariant } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", id)
    .limit(1)
    .maybeSingle();

  if (existingVariant) {
    const { error } = await supabase
      .from("product_variants")
      .update({ regular_price: price, sale_price: null, is_active: true })
      .eq("id", existingVariant.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("product_variants").insert({
      product_id: id,
      regular_price: price,
      sale_price: null,
      is_default: true,
      is_active: true,
      // Not tracked: create_order_atomic skips variant stock for bundles.
      stock: null,
    });
    if (error) return { error: error.message };
  }

  // Contents are replaced wholesale rather than diffed: the list is two
  // or three rows, and a replace cannot leave a stale row behind.
  await supabase.from("bundle_items").delete().eq("bundle_product_id", id);
  const { error: itemsError } = await supabase.from("bundle_items").insert(
    items.map((item, index) => ({
      bundle_product_id: id!,
      item_product_id: item.productId,
      item_variant_id: item.variantId,
      quantity: item.quantity,
      sort_order: index,
    })),
  );
  if (itemsError) return { error: itemsError.message };

  if (imageUrl) {
    const { data: existingImage } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", id)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (existingImage) {
      await supabase.from("product_images").update({ image_url: imageUrl }).eq("id", existingImage.id);
    } else {
      await supabase.from("product_images").insert({ product_id: id, image_url: imageUrl, sort_order: 0 });
    }
  }

  const { data: saved } = await supabase.from("products").select("slug").eq("id", id).maybeSingle();
  revalidateBundle(saved?.slug);
  return { ok: true, bundleId: id! };
}

export async function setBundlePublished(bundleId: string, published: boolean): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  if (published) {
    // Publishing is the moment this becomes buyable, so the contents are
    // re-checked here as well as at save time -- an item could have been
    // unpublished or deleted in between.
    const { data: rows } = await supabase
      .from("bundle_items")
      .select("item_product_id, item_variant_id, quantity")
      .eq("bundle_product_id", bundleId);
    const items = (rows ?? []).map((r) => ({
      productId: r.item_product_id,
      variantId: r.item_variant_id,
      quantity: r.quantity,
    }));
    if (items.length < MIN_ITEMS) return { error: `A bundle needs at least ${MIN_ITEMS} products before it can go live.` };
    const valid = await validateItems(supabase, items);
    if ("error" in valid) return valid;
  }

  const { error } = await supabase
    .from("products")
    .update({ status: published ? "published" : "draft", updated_at: new Date().toISOString() })
    .eq("id", bundleId)
    .eq("product_kind", "bundle");
  if (error) return { error: error.message };

  const { data: saved } = await supabase.from("products").select("slug").eq("id", bundleId).maybeSingle();
  revalidateBundle(saved?.slug);
  return {};
}

// Cost prices are admin-only and live in their own table, never on
// product_variants -- that table is readable by every visitor, so a cost
// column there would be one API call away from any customer.
export async function saveVariantCost(variantId: string, cost: number): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  if (!Number.isFinite(cost) || cost < 0) return { error: "Enter a cost of zero or more." };

  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("variant_costs").upsert({
    variant_id: variantId,
    cost,
    updated_at: new Date().toISOString(),
    updated_by: auth.user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/bundles");
  return {};
}
