"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";

export interface ImportRow {
  name?: string;
  brand?: string;
  model?: string;
  sku?: string;
  category?: string;
  actual_price?: string;
  special_price?: string;
  stock?: string;
  status?: string;
  bluetooth?: string;
  is_featured?: string;
  description?: string;
  compatible_devices?: string;
  whats_in_box?: string;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  successCount: number;
  errors: ImportError[];
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Bulk-imported descriptions are plain text (no rich-text authoring in a
// spreadsheet cell), but the storefront renders `description` as raw HTML —
// escape and wrap in paragraphs so it displays correctly and safely, the
// same shape the rich-text editor would have produced for plain text.
function plainTextToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n+/)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

export async function bulkImportProducts(rows: ImportRow[]): Promise<BulkImportResult> {
  const supabase = await requireAdminClient();

  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryIdByName = new Map(
    (categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id] as const),
  );

  const { data: existingProducts } = await supabase.from("products").select("slug");
  const existingSlugs = new Set((existingProducts ?? []).map((p) => p.slug));

  const errors: ImportError[] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // account for the header row

    const name = row.name?.trim();
    if (!name) {
      errors.push({ row: rowNumber, message: "Missing product name." });
      continue;
    }

    const categoryName = row.category?.trim().toLowerCase();
    const categoryId = categoryName ? categoryIdByName.get(categoryName) : undefined;
    if (!categoryId) {
      errors.push({
        row: rowNumber,
        message: `Category "${row.category ?? ""}" not found — check spelling against your existing categories.`,
      });
      continue;
    }

    const actualPrice = Number(row.actual_price);
    if (!row.actual_price || Number.isNaN(actualPrice) || actualPrice <= 0) {
      errors.push({ row: rowNumber, message: "Invalid or missing actual_price." });
      continue;
    }

    const specialPriceRaw = row.special_price?.trim();
    const specialPrice = specialPriceRaw ? Number(specialPriceRaw) : null;
    if (specialPriceRaw && Number.isNaN(specialPrice)) {
      errors.push({ row: rowNumber, message: "Invalid special_price." });
      continue;
    }

    const stock = row.stock?.trim() ? Number(row.stock) : 0;
    if (Number.isNaN(stock) || stock < 0) {
      errors.push({ row: rowNumber, message: "Invalid stock." });
      continue;
    }

    let slug = slugify(name);
    while (existingSlugs.has(slug)) {
      slug = slugify(name, 55) + "-" + Math.floor(Math.random() * 900 + 100);
    }
    existingSlugs.add(slug);

    const status = row.status?.trim().toLowerCase() === "published" ? "published" : "draft";

    const { error } = await supabase.from("products").insert({
      slug,
      name,
      brand: row.brand?.trim() || null,
      model: row.model?.trim() || null,
      sku: row.sku?.trim() || null,
      category_id: categoryId,
      actual_price: actualPrice,
      special_price: specialPrice,
      stock,
      status,
      bluetooth: parseBoolean(row.bluetooth),
      is_featured: parseBoolean(row.is_featured),
      description: plainTextToHtml(row.description ?? ""),
      compatible_devices: parseList(row.compatible_devices),
      whats_in_box: parseList(row.whats_in_box),
    });

    if (error) {
      errors.push({ row: rowNumber, message: error.message });
      continue;
    }

    successCount += 1;
  }

  if (successCount > 0) revalidatePath("/admin/products");

  return { successCount, errors };
}
