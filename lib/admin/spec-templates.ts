"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";

export type TemplateFormState = { error: string } | { success: true } | undefined;
export type FieldFormState = { error: string } | { success: true } | undefined;

function revalidateSpecTemplatePaths() {
  revalidatePath("/admin/spec-templates");
  revalidatePath("/", "layout");
}

function readTemplateFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  return { name, slug };
}

export async function createTemplate(
  _prevState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const supabase = await requireAdminClient();
  const fields = readTemplateFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase.from("spec_templates").insert(fields);

  if (error) {
    if (error.code === "23505") return { error: "A template with this slug already exists." };
    return { error: error.message };
  }

  revalidateSpecTemplatePaths();
  return { success: true };
}

export async function updateTemplate(
  templateId: string,
  _prevState: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const supabase = await requireAdminClient();
  const fields = readTemplateFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase.from("spec_templates").update(fields).eq("id", templateId);

  if (error) {
    if (error.code === "23505") return { error: "A template with this slug already exists." };
    return { error: error.message };
  }

  revalidateSpecTemplatePaths();
  return { success: true };
}

// Checked explicitly rather than left to categories.spec_template_id's
// implicit FK NO ACTION -- that would reject the delete either way, but
// with an unhelpful raw constraint-violation message instead of a clear one.
export async function deleteTemplate(templateId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const { count: categoryCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("spec_template_id", templateId);

  if ((categoryCount ?? 0) > 0) {
    return { error: "This template is still assigned to categories -- reassign them first." };
  }

  const { error } = await supabase.from("spec_templates").delete().eq("id", templateId);
  if (error) return { error: error.message };

  revalidateSpecTemplatePaths();
  return {};
}

function readFieldFields(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const keyInput = String(formData.get("fieldKey") ?? "").trim();
  const fieldKey = slugify(keyInput || label);
  const fieldType = String(formData.get("fieldType") ?? "text");
  const unit = String(formData.get("unit") ?? "").trim() || null;

  return {
    label,
    fieldKey,
    fieldType: (["text", "boolean", "list"].includes(fieldType) ? fieldType : "text") as
      | "text"
      | "boolean"
      | "list",
    unit,
  };
}

export async function createField(
  templateId: string,
  _prevState: FieldFormState,
  formData: FormData,
): Promise<FieldFormState> {
  const supabase = await requireAdminClient();
  const fields = readFieldFields(formData);
  if (!fields.label) return { error: "Label is required." };

  const { count } = await supabase
    .from("spec_fields")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  const { error } = await supabase.from("spec_fields").insert({
    template_id: templateId,
    label: fields.label,
    field_key: fields.fieldKey,
    field_type: fields.fieldType,
    unit: fields.unit,
    sort_order: count ?? 0,
  });

  if (error) {
    if (error.code === "23505") return { error: "A field with this key already exists on this template." };
    return { error: error.message };
  }

  revalidateSpecTemplatePaths();
  return { success: true };
}

export async function updateField(
  fieldId: string,
  _prevState: FieldFormState,
  formData: FormData,
): Promise<FieldFormState> {
  const supabase = await requireAdminClient();
  const fields = readFieldFields(formData);
  if (!fields.label) return { error: "Label is required." };

  const { error } = await supabase
    .from("spec_fields")
    .update({
      label: fields.label,
      field_key: fields.fieldKey,
      field_type: fields.fieldType,
      unit: fields.unit,
    })
    .eq("id", fieldId);

  if (error) {
    if (error.code === "23505") return { error: "A field with this key already exists on this template." };
    return { error: error.message };
  }

  revalidateSpecTemplatePaths();
  return { success: true };
}

// Checked explicitly -- product_spec_values.spec_field_id has no ON DELETE
// CASCADE (see sql/049's comment re: the Stage 3 lesson), so an unguarded
// delete would hit a raw FK violation; this gives a clear message instead.
export async function deleteField(fieldId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const { count: valueCount } = await supabase
    .from("product_spec_values")
    .select("product_id", { count: "exact", head: true })
    .eq("spec_field_id", fieldId);

  if ((valueCount ?? 0) > 0) {
    return { error: "Products still have values set for this field -- clear them first." };
  }

  const { error } = await supabase.from("spec_fields").delete().eq("id", fieldId);
  if (error) return { error: error.message };

  revalidateSpecTemplatePaths();
  return {};
}

export async function reorderFields(orderedIds: string[]): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("spec_fields").update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidateSpecTemplatePaths();
  return {};
}

// Replaces a product's full spec-value set in one call -- delete-then-insert,
// same shape as setProductTags/replaceProductImages.
export async function setProductSpecValues(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  productId: string,
  values: { fieldId: string; value: string }[],
): Promise<void> {
  await supabase.from("product_spec_values").delete().eq("product_id", productId);

  const rows = values
    .filter((v) => v.value.trim() !== "")
    .map((v) => ({ product_id: productId, spec_field_id: v.fieldId, value: v.value }));
  if (rows.length === 0) return;

  const { error } = await supabase.from("product_spec_values").insert(rows);
  if (error) throw new Error(error.message);
}
