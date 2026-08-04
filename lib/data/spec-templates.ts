import { createClient } from "@/lib/supabase/server";
import type { Product, SpecField, SpecTemplate } from "@/types";

export async function getSpecTemplates(): Promise<SpecTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("spec_templates").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function getSpecTemplateWithFields(
  templateId: string,
): Promise<{ template: SpecTemplate; fields: SpecField[] } | null> {
  const supabase = await createClient();
  const [{ data: template }, { data: fields, error: fieldsError }] = await Promise.all([
    supabase.from("spec_templates").select("*").eq("id", templateId).maybeSingle(),
    supabase.from("spec_fields").select("*").eq("template_id", templateId).order("sort_order"),
  ]);

  if (!template) return null;
  if (fieldsError) throw fieldsError;
  return { template, fields: fields ?? [] };
}

// Every template with its fields, for the product form's client-side
// "which fields apply to the currently-selected category" lookup — small
// dataset, cheaper to send once than to round-trip on every category change.
export async function getAllTemplatesWithFields(): Promise<
  { template: SpecTemplate; fields: SpecField[] }[]
> {
  const supabase = await createClient();
  const [{ data: templates, error: templatesError }, { data: fields, error: fieldsError }] =
    await Promise.all([
      supabase.from("spec_templates").select("*").order("name"),
      supabase.from("spec_fields").select("*").order("sort_order"),
    ]);

  if (templatesError) throw templatesError;
  if (fieldsError) throw fieldsError;

  return (templates ?? []).map((template) => ({
    template,
    fields: (fields ?? []).filter((f) => f.template_id === template.id),
  }));
}

export async function getSpecFieldsForCategory(categoryId: string): Promise<SpecField[]> {
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("spec_template_id")
    .eq("id", categoryId)
    .maybeSingle();

  if (!category?.spec_template_id) return [];

  const { data, error } = await supabase
    .from("spec_fields")
    .select("*")
    .eq("template_id", category.spec_template_id)
    .order("sort_order");

  if (error) throw error;
  return data ?? [];
}

export interface DisplaySpec {
  label: string;
  value: string;
  type: "text" | "boolean" | "list";
  unit: string | null;
}

// Used by the product form to pre-fill the dynamic editor's existing values,
// keyed by field id.
export async function getProductSpecValues(productId: string): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_spec_values")
    .select("spec_field_id, value")
    .eq("product_id", productId);

  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.spec_field_id, row.value]));
}

// Display-ready rows for the PDP's SpecsTable -- joins the product's
// category's template fields with its saved values, formats list values
// (JSON-encoded, same shape TagInput produces) and booleans for display.
export async function getProductSpecs(product: Product): Promise<DisplaySpec[]> {
  const fields = await getSpecFieldsForCategory(product.category_id);
  if (fields.length === 0) return [];

  const values = await getProductSpecValues(product.id);

  const specs: DisplaySpec[] = [];
  for (const field of fields) {
    const raw = values[field.id];
    if (raw == null) continue;

    let displayValue: string;
    if (field.field_type === "boolean") {
      displayValue = raw === "true" ? "Yes" : "No";
    } else if (field.field_type === "list") {
      try {
        const parsed = JSON.parse(raw);
        displayValue = Array.isArray(parsed) ? parsed.join(", ") : raw;
      } catch {
        displayValue = raw;
      }
      if (!displayValue) continue;
    } else {
      displayValue = raw;
      if (!displayValue.trim()) continue;
    }

    specs.push({
      label: field.label,
      value: displayValue,
      type: field.field_type as DisplaySpec["type"],
      unit: field.unit,
    });
  }

  return specs;
}
