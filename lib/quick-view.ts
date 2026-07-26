"use server";

import { getProductDetailBySlug } from "@/lib/data/products";
import type { ProductDetail } from "@/lib/data/products";

export async function getQuickViewProduct(slug: string): Promise<ProductDetail | null> {
  return getProductDetailBySlug(slug);
}
