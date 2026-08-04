"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveVariantPrice } from "@/lib/utils";
import type { CartItem } from "@/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Same identity a cart line has everywhere else in the app: a product on
// its own, or a product pinned to one specific variant.
function lineKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? "base"}`;
}

// Shared by a normal logged-in cart load and the login-merge routine below —
// one re-validated view of "what does this user's saved cart actually look
// like right now", built from a single batched query rather than N.
async function fetchValidatedServerCart(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<CartItem[]> {
  const { data: rows, error } = await supabase
    .from("cart_items")
    .select("product_id, variant_id, quantity")
    .eq("user_id", userId);
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const ids = rows.map((r) => r.product_id);
  const variantIds = rows.map((r) => r.variant_id).filter((id): id is string => id !== null);
  const [
    { data: products, error: productsError },
    { data: images, error: imagesError },
    { data: variants, error: variantsError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, actual_price, special_price, stock, is_deleted, status")
      .in("id", ids),
    supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .in("product_id", ids)
      .order("sort_order", { ascending: true }),
    variantIds.length > 0
      ? supabase
          .from("product_variants")
          .select("id, color_name, color_hex, price, stock")
          .in("id", variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsError) throw productsError;
  if (imagesError) throw imagesError;
  if (variantsError) throw variantsError;

  const primaryImageByProductId = new Map<string, string>();
  for (const image of images ?? []) {
    if (!primaryImageByProductId.has(image.product_id)) {
      primaryImageByProductId.set(image.product_id, image.image_url);
    }
  }
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));

  const validated: CartItem[] = [];
  for (const row of rows) {
    const product = productById.get(row.product_id);
    if (!product || product.is_deleted || product.status !== "published" || product.stock <= 0) {
      continue;
    }
    // A variant_id that no longer resolves (deleted between page loads,
    // before the FK cascade catches up) falls back to the base product
    // rather than silently vanishing the whole line.
    const variant = row.variant_id ? (variantById.get(row.variant_id) ?? null) : null;
    const effectiveStock = variant?.stock ?? product.stock;
    validated.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: getEffectiveVariantPrice(product, variant),
      image: primaryImageByProductId.get(product.id) ?? null,
      quantity: Math.min(row.quantity, effectiveStock),
      variantId: variant?.id ?? null,
      variantName: variant?.color_name ?? null,
      variantColorHex: variant?.color_hex ?? null,
    });
  }
  return validated;
}

async function requireUserId(supabase: SupabaseServerClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

export async function getServerCart(): Promise<CartItem[]> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  return fetchValidatedServerCart(supabase, userId);
}

// Runs once per sign-in. Combines the guest's local items with whatever the
// account already had saved, re-validated against live stock, then persists
// the merged result and hands it back so the caller can clear localStorage
// and swap it straight into in-memory state.
export async function mergeCartOnLogin(
  guestItems: { productId: string; variantId: string | null; quantity: number }[],
): Promise<CartItem[]> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const serverCart = await fetchValidatedServerCart(supabase, userId);

  if (guestItems.length === 0) {
    return serverCart;
  }

  const guestIds = guestItems.map((i) => i.productId);
  const guestVariantIds = guestItems
    .map((i) => i.variantId)
    .filter((id): id is string => id !== null);
  const [
    { data: guestProducts, error: guestProductsError },
    { data: guestImages, error: guestImagesError },
    { data: guestVariants, error: guestVariantsError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, actual_price, special_price, stock, is_deleted, status")
      .in("id", guestIds),
    supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .in("product_id", guestIds)
      .order("sort_order", { ascending: true }),
    guestVariantIds.length > 0
      ? supabase
          .from("product_variants")
          .select("id, color_name, color_hex, price, stock")
          .in("id", guestVariantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (guestProductsError) throw guestProductsError;
  if (guestImagesError) throw guestImagesError;
  if (guestVariantsError) throw guestVariantsError;

  const guestImageByProductId = new Map<string, string>();
  for (const image of guestImages ?? []) {
    if (!guestImageByProductId.has(image.product_id)) {
      guestImageByProductId.set(image.product_id, image.image_url);
    }
  }
  const guestProductById = new Map((guestProducts ?? []).map((p) => [p.id, p]));
  const guestVariantById = new Map((guestVariants ?? []).map((v) => [v.id, v]));

  const merged = new Map<string, CartItem>(
    serverCart.map((i) => [lineKey(i.productId, i.variantId), i]),
  );

  for (const guestItem of guestItems) {
    const product = guestProductById.get(guestItem.productId);
    if (!product || product.is_deleted || product.status !== "published" || product.stock <= 0) {
      continue;
    }
    const variant = guestItem.variantId
      ? (guestVariantById.get(guestItem.variantId) ?? null)
      : null;
    const effectiveStock = variant?.stock ?? product.stock;
    const key = lineKey(guestItem.productId, variant?.id ?? null);
    const existing = merged.get(key);
    const combinedQuantity = (existing?.quantity ?? 0) + guestItem.quantity;
    merged.set(key, {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: getEffectiveVariantPrice(product, variant),
      image: guestImageByProductId.get(product.id) ?? existing?.image ?? null,
      quantity: Math.min(combinedQuantity, effectiveStock),
      variantId: variant?.id ?? null,
      variantName: variant?.color_name ?? null,
      variantColorHex: variant?.color_hex ?? null,
    });
  }

  const mergedList = Array.from(merged.values());

  // unique(user_id, product_id, variant_key) makes this a plain upsert, not
  // manual diffing -- variant_key is a generated column, but it's still a
  // valid onConflict target since Postgrest resolves it against the actual
  // unique constraint, not the literal column list.
  const { error: upsertError } = await supabase.from("cart_items").upsert(
    mergedList.map((item) => ({
      user_id: userId,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
    })),
    { onConflict: "user_id,product_id,variant_key" },
  );
  if (upsertError) throw upsertError;

  return mergedList;
}

export async function upsertCartItem(
  productId: string,
  variantId: string | null,
  quantity: number,
): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("cart_items")
    .upsert(
      { user_id: userId, product_id: productId, variant_id: variantId, quantity },
      { onConflict: "user_id,product_id,variant_key" },
    );
  if (error) throw error;
}

export async function removeCartItem(productId: string, variantId: string | null): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  let query = supabase.from("cart_items").delete().eq("user_id", userId).eq("product_id", productId);
  query = variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null);
  const { error } = await query;
  if (error) throw error;
}

export async function clearServerCart(): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (error) throw error;
}
