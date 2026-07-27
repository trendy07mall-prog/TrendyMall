"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import { getAllMatchingAdminProducts, getAdminProductsByIds } from "@/lib/admin/products-query";
import type { AdminProductFilterState } from "@/lib/admin/product-filters";
import type { Product } from "@/types";

// Same columns as the CSV import template (components/admin/
// DownloadTemplateButton.tsx), so a round-tripped export can be re-imported.
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
  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name] as const));

  const rows = products.map((p) =>
    [
      p.name,
      p.brand ?? "",
      p.model ?? "",
      p.sku ?? "",
      categoryNameById.get(p.category_id) ?? "",
      String(p.actual_price),
      p.special_price != null ? String(p.special_price) : "",
      String(p.stock),
      p.status,
      p.bluetooth ? "true" : "false",
      p.is_featured ? "true" : "false",
      p.description ?? "",
      p.compatible_devices.join(";"),
      p.whats_in_box.join(";"),
    ]
      .map(csvEscape)
      .join(","),
  );

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
