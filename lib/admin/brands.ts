"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";

export type BrandFormState = { error: string } | { success: true } | undefined;

function revalidateBrandPaths() {
  revalidatePath("/admin/brands");
  revalidatePath("/", "layout");
}

function readBrandFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const description = String(formData.get("description") ?? "").trim() || null;
  const imagePath = String(formData.get("imagePath") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";

  return { name, slug, description, imagePath, isActive };
}

export async function createBrand(
  _prevState: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const supabase = await requireAdminClient();
  const fields = readBrandFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase.from("brands").insert({
    name: fields.name,
    slug: fields.slug,
    description: fields.description,
    image_path: fields.imagePath,
    is_active: fields.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A brand with this slug already exists." };
    return { error: error.message };
  }

  revalidateBrandPaths();
  return { success: true };
}

export async function updateBrand(
  brandId: string,
  _prevState: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const supabase = await requireAdminClient();
  const fields = readBrandFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase
    .from("brands")
    .update({
      name: fields.name,
      slug: fields.slug,
      description: fields.description,
      image_path: fields.imagePath,
      is_active: fields.isActive,
    })
    .eq("id", brandId);

  if (error) {
    if (error.code === "23505") return { error: "A brand with this slug already exists." };
    return { error: error.message };
  }

  revalidateBrandPaths();
  return { success: true };
}

// Checked explicitly rather than left to products.brand_id's implicit FK
// NO ACTION -- that would reject the delete either way, but with an
// unhelpful raw constraint-violation message instead of a clear one.
export async function deleteBrand(brandId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);

  if ((productCount ?? 0) > 0) {
    return { error: "This brand still has products assigned to it -- move or reassign them first." };
  }

  const { error } = await supabase.from("brands").delete().eq("id", brandId);
  if (error) return { error: error.message };

  revalidateBrandPaths();
  return {};
}

export async function toggleBrandActive(
  brandId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("brands").update({ is_active: isActive }).eq("id", brandId);

  if (error) return { error: error.message };
  revalidateBrandPaths();
  return {};
}

// Used by the product form's inline "+ Add new brand" affordance and by CSV
// import's match-or-create step -- both need "find or create by name"
// without going through the full form-state action shape above.
export async function findOrCreateBrandByName(name: string): Promise<{ id: string; name: string }> {
  const supabase = await requireAdminClient();
  const trimmed = name.trim();

  const { data: existing } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", trimmed)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name: trimmed, slug: slugify(trimmed) })
    .select("id, name")
    .single();

  if (error) {
    // Slug collision on a genuinely different name that normalizes the
    // same -- fall back to a suffixed slug rather than failing outright.
    if (error.code === "23505") {
      const { data: retried, error: retryError } = await supabase
        .from("brands")
        .insert({ name: trimmed, slug: `${slugify(trimmed)}-${Date.now().toString(36)}` })
        .select("id, name")
        .single();
      if (retryError) throw retryError;
      return retried;
    }
    throw error;
  }

  return created;
}
