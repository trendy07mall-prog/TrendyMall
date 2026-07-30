"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectivePrice } from "@/lib/utils";
import type { CartItem } from "@/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Shared by a normal logged-in cart load and the login-merge routine below —
// one re-validated view of "what does this user's saved cart actually look
// like right now", built from a single batched query rather than N.
async function fetchValidatedServerCart(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<CartItem[]> {
  const { data: rows, error } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", userId);
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const ids = rows.map((r) => r.product_id);
  const [{ data: products, error: productsError }, { data: images, error: imagesError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, slug, name, actual_price, special_price, stock, is_deleted, status")
        .in("id", ids),
      supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", ids)
        .order("sort_order", { ascending: true }),
    ]);
  if (productsError) throw productsError;
  if (imagesError) throw imagesError;

  const primaryImageByProductId = new Map<string, string>();
  for (const image of images ?? []) {
    if (!primaryImageByProductId.has(image.product_id)) {
      primaryImageByProductId.set(image.product_id, image.image_url);
    }
  }
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const validated: CartItem[] = [];
  for (const row of rows) {
    const product = productById.get(row.product_id);
    if (!product || product.is_deleted || product.status !== "published" || product.stock <= 0) {
      continue;
    }
    validated.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: getEffectivePrice(product),
      image: primaryImageByProductId.get(product.id) ?? null,
      quantity: Math.min(row.quantity, product.stock),
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
  guestItems: { productId: string; quantity: number }[],
): Promise<CartItem[]> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const serverCart = await fetchValidatedServerCart(supabase, userId);

  if (guestItems.length === 0) {
    return serverCart;
  }

  const guestIds = guestItems.map((i) => i.productId);
  const [{ data: guestProducts, error: guestProductsError }, { data: guestImages, error: guestImagesError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, slug, name, actual_price, special_price, stock, is_deleted, status")
        .in("id", guestIds),
      supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", guestIds)
        .order("sort_order", { ascending: true }),
    ]);
  if (guestProductsError) throw guestProductsError;
  if (guestImagesError) throw guestImagesError;

  const guestImageByProductId = new Map<string, string>();
  for (const image of guestImages ?? []) {
    if (!guestImageByProductId.has(image.product_id)) {
      guestImageByProductId.set(image.product_id, image.image_url);
    }
  }
  const guestProductById = new Map((guestProducts ?? []).map((p) => [p.id, p]));

  const merged = new Map<string, CartItem>(serverCart.map((i) => [i.productId, i]));

  for (const guestItem of guestItems) {
    const product = guestProductById.get(guestItem.productId);
    if (!product || product.is_deleted || product.status !== "published" || product.stock <= 0) {
      continue;
    }
    const existing = merged.get(guestItem.productId);
    const combinedQuantity = (existing?.quantity ?? 0) + guestItem.quantity;
    merged.set(guestItem.productId, {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: getEffectivePrice(product),
      image: guestImageByProductId.get(product.id) ?? existing?.image ?? null,
      quantity: Math.min(combinedQuantity, product.stock),
    });
  }

  const mergedList = Array.from(merged.values());

  // unique(user_id, product_id) makes this a plain upsert, not manual diffing.
  const { error: upsertError } = await supabase.from("cart_items").upsert(
    mergedList.map((item) => ({
      user_id: userId,
      product_id: item.productId,
      quantity: item.quantity,
    })),
    { onConflict: "user_id,product_id" },
  );
  if (upsertError) throw upsertError;

  return mergedList;
}

export async function upsertCartItem(productId: string, quantity: number): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("cart_items")
    .upsert({ user_id: userId, product_id: productId, quantity }, { onConflict: "user_id,product_id" });
  if (error) throw error;
}

export async function removeCartItem(productId: string): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  if (error) throw error;
}

export async function clearServerCart(): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (error) throw error;
}
