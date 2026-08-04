"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";

export type AttributeFormState = { error: string } | { success: true } | undefined;
export type AttributeValueFormState = { error: string } | { success: true } | undefined;

function revalidateAttributePaths() {
  revalidatePath("/admin/attributes");
  revalidatePath("/", "layout");
}

function readAttributeFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  return { name, slug };
}

export async function createAttribute(
  _prevState: AttributeFormState,
  formData: FormData,
): Promise<AttributeFormState> {
  const supabase = await requireAdminClient();
  const fields = readAttributeFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase.from("attributes").insert(fields);

  if (error) {
    if (error.code === "23505") return { error: "An attribute with this slug already exists." };
    return { error: error.message };
  }

  revalidateAttributePaths();
  return { success: true };
}

export async function updateAttribute(
  attributeId: string,
  _prevState: AttributeFormState,
  formData: FormData,
): Promise<AttributeFormState> {
  const supabase = await requireAdminClient();
  const fields = readAttributeFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase.from("attributes").update(fields).eq("id", attributeId);

  if (error) {
    if (error.code === "23505") return { error: "An attribute with this slug already exists." };
    return { error: error.message };
  }

  revalidateAttributePaths();
  return { success: true };
}

// Checked explicitly -- deleting an attribute cascades to its values
// (attribute_values.attribute_id is ON DELETE CASCADE, since values are
// meaningless without their attribute), but only once none of those values
// are still assigned to a product. Blocking here avoids silently untagging
// products the way an unguarded cascade would.
export async function deleteAttribute(attributeId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const { data: values } = await supabase
    .from("attribute_values")
    .select("id")
    .eq("attribute_id", attributeId);

  if (values && values.length > 0) {
    const { count } = await supabase
      .from("product_attribute_values")
      .select("product_id", { count: "exact", head: true })
      .in("attribute_value_id", values.map((v) => v.id));

    if ((count ?? 0) > 0) {
      return { error: "Some of this attribute's values are still assigned to products -- remove those first." };
    }
  }

  const { error } = await supabase.from("attributes").delete().eq("id", attributeId);
  if (error) return { error: error.message };

  revalidateAttributePaths();
  return {};
}

function readAttributeValueFields(formData: FormData) {
  const value = String(formData.get("value") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || value);
  const colorHex = String(formData.get("colorHex") ?? "").trim() || null;

  return { value, slug, colorHex };
}

export async function createAttributeValue(
  attributeId: string,
  _prevState: AttributeValueFormState,
  formData: FormData,
): Promise<AttributeValueFormState> {
  const supabase = await requireAdminClient();
  const fields = readAttributeValueFields(formData);
  if (!fields.value) return { error: "Value is required." };

  const { count } = await supabase
    .from("attribute_values")
    .select("id", { count: "exact", head: true })
    .eq("attribute_id", attributeId);

  const { error } = await supabase.from("attribute_values").insert({
    attribute_id: attributeId,
    value: fields.value,
    slug: fields.slug,
    color_hex: fields.colorHex,
    sort_order: count ?? 0,
  });

  if (error) {
    if (error.code === "23505") return { error: "A value with this slug already exists." };
    if (error.code === "23514") return { error: "Invalid hex color -- use a format like #FF0000." };
    return { error: error.message };
  }

  revalidateAttributePaths();
  return { success: true };
}

export async function updateAttributeValue(
  valueId: string,
  _prevState: AttributeValueFormState,
  formData: FormData,
): Promise<AttributeValueFormState> {
  const supabase = await requireAdminClient();
  const fields = readAttributeValueFields(formData);
  if (!fields.value) return { error: "Value is required." };

  const { error } = await supabase
    .from("attribute_values")
    .update({ value: fields.value, slug: fields.slug, color_hex: fields.colorHex })
    .eq("id", valueId);

  if (error) {
    if (error.code === "23505") return { error: "A value with this slug already exists." };
    if (error.code === "23514") return { error: "Invalid hex color -- use a format like #FF0000." };
    return { error: error.message };
  }

  revalidateAttributePaths();
  return { success: true };
}

// Checked explicitly -- product_attribute_values.attribute_value_id has no
// ON DELETE CASCADE (see sql/050's comment re: the Stage 3 lesson), so an
// unguarded delete would hit a raw FK violation; this gives a clear
// message instead.
export async function deleteAttributeValue(valueId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const { count } = await supabase
    .from("product_attribute_values")
    .select("product_id", { count: "exact", head: true })
    .eq("attribute_value_id", valueId);

  if ((count ?? 0) > 0) {
    return { error: "This value is still assigned to products -- remove it from them first." };
  }

  const { error } = await supabase.from("attribute_values").delete().eq("id", valueId);
  if (error) return { error: error.message };

  revalidateAttributePaths();
  return {};
}

export async function reorderAttributeValues(orderedIds: string[]): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("attribute_values").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidateAttributePaths();
  return {};
}

// Replaces a product's full attribute-value set in one call -- delete-then-
// insert, same shape as setProductTags.
export async function setProductAttributeValues(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  productId: string,
  valueIds: string[],
): Promise<void> {
  await supabase.from("product_attribute_values").delete().eq("product_id", productId);
  if (valueIds.length === 0) return;

  const rows = valueIds.map((attribute_value_id) => ({ product_id: productId, attribute_value_id }));
  const { error } = await supabase.from("product_attribute_values").insert(rows);
  if (error) throw new Error(error.message);
}
