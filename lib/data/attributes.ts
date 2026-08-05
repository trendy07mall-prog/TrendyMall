import { createClient } from "@/lib/supabase/server";
import type { Attribute, AttributeValue } from "@/types";

export async function getAttributes(): Promise<Attribute[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("attributes").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function getAttributeValues(attributeId: string): Promise<AttributeValue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attribute_values")
    .select("*")
    .eq("attribute_id", attributeId)
    .order("sort_order");

  if (error) throw error;
  return data ?? [];
}

// Every attribute with its values, for the product form's checkboxes --
// small dataset, cheaper to send once than to round-trip per attribute.
export async function getAllAttributesWithValues(): Promise<
  { attribute: Attribute; values: AttributeValue[] }[]
> {
  const supabase = await createClient();
  const [{ data: attributes, error: attributesError }, { data: values, error: valuesError }] =
    await Promise.all([
      supabase.from("attributes").select("*").order("sort_order"),
      supabase.from("attribute_values").select("*").order("sort_order"),
    ]);

  if (attributesError) throw attributesError;
  if (valuesError) throw valuesError;

  return (attributes ?? []).map((attribute) => ({
    attribute,
    values: (values ?? []).filter((v) => v.attribute_id === attribute.id),
  }));
}

// Flat catalog of every attribute value, for toProductListFilters' slug->id
// resolution -- mirrors how getTags()/getBrands() feed the same pattern.
export async function getAllAttributeValues(): Promise<AttributeValue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("attribute_values").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

// Used by the product form to pre-check the right boxes when editing.
export async function getProductAttributeValueIds(productId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_attribute_values")
    .select("attribute_value_id")
    .eq("product_id", productId);

  if (error) throw error;
  return (data ?? []).map((row) => row.attribute_value_id);
}

// A single product's assigned attribute values, grouped by attribute --
// for the PDP's generic attribute selector (e.g. "Mah"). Deliberately
// excludes the "color" attribute: Color variants (product_variants) already
// have their own real price/stock/SKU-aware swatch picker on the PDP, so
// showing a second, independent Color picker here (Stage 5's attribute
// system is intentionally NOT synced with product_variants) would just be
// confusing -- Color stays filter-sidebar-only via this function.
export async function getProductAttributesForDetail(
  productId: string,
): Promise<{ attribute: Attribute; values: AttributeValue[] }[]> {
  const supabase = await createClient();
  const { data: assignedIds, error: assignedError } = await supabase
    .from("product_attribute_values")
    .select("attribute_value_id")
    .eq("product_id", productId);
  if (assignedError) throw assignedError;
  if (!assignedIds || assignedIds.length === 0) return [];

  const { data: values, error: valuesError } = await supabase
    .from("attribute_values")
    .select("*, attributes(*)")
    .in(
      "id",
      assignedIds.map((row) => row.attribute_value_id),
    )
    .order("sort_order");
  if (valuesError) throw valuesError;

  const grouped = new Map<string, { attribute: Attribute; values: AttributeValue[] }>();
  for (const row of values ?? []) {
    const { attributes: attribute, ...value } = row as AttributeValue & { attributes: Attribute };
    if (!attribute || attribute.slug === "color") continue;
    const entry = grouped.get(attribute.id);
    if (entry) {
      entry.values.push(value);
    } else {
      grouped.set(attribute.id, { attribute, values: [value] });
    }
  }

  return [...grouped.values()].sort((a, b) => a.attribute.sort_order - b.attribute.sort_order);
}

// Every product id assigned any of the given attribute-value ids -- feeds
// straight into products' existing `.in("id", ids)` query pattern, same
// shape as getProductIdsForTags.
export async function getProductIdsForAttributeValues(valueIds: string[]): Promise<string[]> {
  if (valueIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_attribute_values")
    .select("product_id")
    .in("attribute_value_id", valueIds);

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.product_id))];
}
