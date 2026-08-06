"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import { getAllMatchingAdminProducts, getAdminProductsByIds } from "@/lib/admin/products-query";
import { resolveCardDisplay } from "@/lib/data/products";
import type { VariantPriceRow } from "@/lib/data/products";
import type { AdminProductFilterState } from "@/lib/admin/product-filters";
import type { Product } from "@/types";

// Same columns as the CSV import template (components/admin/
// DownloadTemplateButton.tsx), so a round-tripped export can be re-imported.
// actual_price/special_price column NAMES are kept as-is even though price
// now lives on product_variants -- export reads the product's cheapest/
// default variant's regular_price/sale_price, and import (products-import.ts)
// creates one default variant per row from these same two values, so the
// external CSV shape/workflow is unchanged for admins.
const HEADER = [
  "name", "brand", "model", "sku", "category", "actual_price", "special_price",
  "stock", "status", "bluetooth", "is_featured", "description",
  "compatible_devices", "whats_in_box",
];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function buildCsv(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  products: Product[],
): Promise<string> {
  const [{ data: categories }, { data: variantRows }] = await Promise.all([
    supabase.from("categories").select("id, name"),
    products.length > 0
      ? supabase
          .from("product_variants")
          .select("id, product_id, regular_price, sale_price, stock, is_default, variant_image_url")
          .in(
            "product_id",
            products.map((p) => p.id),
          )
          .eq("is_active", true)
      : Promise.resolve({ data: [] as VariantPriceRow[] }),
  ]);
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name] as const));

  const variantsByProductId = new Map<string, VariantPriceRow[]>();
  for (const v of (variantRows ?? []) as VariantPriceRow[]) {
    const list = variantsByProductId.get(v.product_id) ?? [];
    list.push(v);
    variantsByProductId.set(v.product_id, list);
  }

  const rows = products.map((p) => {
    const variants = variantsByProductId.get(p.id) ?? [];
    const display =
      variants.length > 0
        ? resolveCardDisplay(variants)
        : { actualPrice: 0, specialPrice: null as number | null };
    return [
      p.name,
      p.brand ?? "",
      p.model ?? "",
      p.sku ?? "",
      categoryNameById.get(p.category_id) ?? "",
      String(display.actualPrice),
      display.specialPrice != null ? String(display.specialPrice) : "",
      String(p.stock),
      p.status,
      p.bluetooth ? "true" : "false",
      p.is_featured ? "true" : "false",
      p.description ?? "",
      p.compatible_devices.join(";"),
      p.whats_in_box.join(";"),
    ]
      .map(csvEscape)
      .join(",");
  });

  return [HEADER.join(","), ...rows].join("\n");
}

export async function exportProductsCsv(filters: AdminProductFilterState): Promise<string> {
  const supabase = await requireAdminClient();
  const products = await getAllMatchingAdminProducts(filters);
  return buildCsv(supabase, products);
}

export async function exportProductsCsvByIds(ids: string[]): Promise<string> {
  const supabase = await requireAdminClient();
  const products = await getAdminProductsByIds(ids);
  return buildCsv(supabase, products);
}
