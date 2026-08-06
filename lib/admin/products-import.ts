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

  // Brand, unlike category, is open-ended -- an unrecognized brand name is
  // auto-created (matching the product form's inline "+ Add new brand"
  // affordance) rather than rejecting the row.
  const { data: brandRows } = await supabase.from("brands").select("id, name");
  const brandByName = new Map(
    (brandRows ?? []).map((b) => [b.name.trim().toLowerCase(), b] as const),
  );

  const { data: existingProducts } = await supabase.from("products").select("slug");
  const existingSlugs = new Set((existingProducts ?? []).map((p) => p.slug));

  // model/compatible_devices/bluetooth stopped being the live admin-form/PDP
  // path in Stage 4 (replaced by category-driven spec templates), but the
  // CSV columns stay as-is -- importing a row with these values populates
  // product_spec_values against the default "General Specs" template too,
  // so a bulk-imported product's specs show up on its PDP immediately
  // rather than only after a manual edit through the new dynamic editor.
  const { data: generalTemplate } = await supabase
    .from("spec_templates")
    .select("id")
    .eq("slug", "general-specs")
    .maybeSingle();
  const { data: generalFields } = generalTemplate
    ? await supabase.from("spec_fields").select("id, field_key").eq("template_id", generalTemplate.id)
    : { data: null };
  const generalFieldIdByKey = new Map((generalFields ?? []).map((f) => [f.field_key, f.id] as const));

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

    const brandInput = row.brand?.trim() || null;
    let brandId: string | null = null;
    let brandName: string | null = null;
    if (brandInput) {
      const existing = brandByName.get(brandInput.toLowerCase());
      if (existing) {
        brandId = existing.id;
        brandName = existing.name;
      } else {
        const { data: created, error: brandError } = await supabase
          .from("brands")
          .insert({ name: brandInput, slug: slugify(brandInput) })
          .select("id, name")
          .single();
        if (brandError || !created) {
          errors.push({ row: rowNumber, message: `Could not create brand "${brandInput}".` });
          continue;
        }
        brandByName.set(brandInput.toLowerCase(), created);
        brandId = created.id;
        brandName = created.name;
      }
    }

    const { data: inserted, error } = await supabase
      .from("products")
      .insert({
        slug,
        name,
        brand: brandName,
        brand_id: brandId,
        model: row.model?.trim() || null,
        sku: row.sku?.trim() || null,
        category_id: categoryId,
        stock,
        status,
        bluetooth: parseBoolean(row.bluetooth),
        is_featured: parseBoolean(row.is_featured),
        description: plainTextToHtml(row.description ?? ""),
        compatible_devices: parseList(row.compatible_devices),
        whats_in_box: parseList(row.whats_in_box),
      })
      .select("id")
      .single();

    if (error || !inserted) {
      errors.push({ row: rowNumber, message: error?.message ?? "Could not create product." });
      continue;
    }

    // Price lives only on product_variants now -- the CSV's actual_price/
    // special_price columns create this product's one default variant
    // (no color, matching the "no real choice" storefront rendering)
    // instead of writing to product-level columns that no longer exist.
    const { error: variantError } = await supabase.from("product_variants").insert({
      product_id: inserted.id,
      color_name: null,
      color_hex: null,
      regular_price: actualPrice,
      sale_price: specialPrice,
      stock,
      sku: null,
      is_default: true,
      is_active: true,
      sort_order: 0,
    });
    if (variantError) {
      errors.push({ row: rowNumber, message: `Product created but variant failed: ${variantError.message}` });
      continue;
    }

    const specRows: { product_id: string; spec_field_id: string; value: string }[] = [];
    const modelFieldId = generalFieldIdByKey.get("model");
    if (modelFieldId && row.model?.trim()) {
      specRows.push({ product_id: inserted.id, spec_field_id: modelFieldId, value: row.model.trim() });
    }
    const devicesFieldId = generalFieldIdByKey.get("compatible-devices");
    const devices = parseList(row.compatible_devices);
    if (devicesFieldId && devices.length > 0) {
      specRows.push({ product_id: inserted.id, spec_field_id: devicesFieldId, value: JSON.stringify(devices) });
    }
    const bluetoothFieldId = generalFieldIdByKey.get("bluetooth");
    if (bluetoothFieldId) {
      specRows.push({
        product_id: inserted.id,
        spec_field_id: bluetoothFieldId,
        value: parseBoolean(row.bluetooth) ? "true" : "false",
      });
    }
    if (specRows.length > 0) {
      await supabase.from("product_spec_values").insert(specRows);
    }

    successCount += 1;
  }

  if (successCount > 0) revalidatePath("/admin/products");

  return { successCount, errors };
}
