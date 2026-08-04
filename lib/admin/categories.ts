"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";

export type CategoryFormState = { error: string } | { success: true } | undefined;

function revalidateCategoryPaths() {
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}

function readCategoryFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const description = String(formData.get("description") ?? "").trim() || null;
  const imagePath = String(formData.get("imagePath") ?? "").trim() || null;
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();
  const parentId = parentIdRaw || null;
  const specTemplateIdRaw = String(formData.get("specTemplateId") ?? "").trim();
  const specTemplateId = specTemplateIdRaw || null;
  const isActive = formData.get("isActive") === "on";

  return { name, slug, description, imagePath, parentId, specTemplateId, isActive };
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const supabase = await requireAdminClient();
  const fields = readCategoryFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase.from("categories").insert({
    name: fields.name,
    slug: fields.slug,
    description: fields.description,
    image_path: fields.imagePath,
    parent_id: fields.parentId,
    spec_template_id: fields.specTemplateId,
    is_active: fields.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A category with this slug already exists." };
    return { error: error.message };
  }

  revalidateCategoryPaths();
  return { success: true };
}

export async function updateCategory(
  categoryId: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const supabase = await requireAdminClient();
  const fields = readCategoryFields(formData);
  if (!fields.name) return { error: "Name is required." };

  // A category can't become its own descendant -- reject reparenting onto
  // itself or anywhere in its own current subtree before it ever reaches
  // the trigger (which has no way to detect a cycle after the fact).
  if (fields.parentId) {
    const { data: current } = await supabase
      .from("categories")
      .select("path")
      .eq("id", categoryId)
      .maybeSingle();
    const { data: target } = await supabase
      .from("categories")
      .select("path")
      .eq("id", fields.parentId)
      .maybeSingle();

    if (current && target && (target.path === current.path || target.path.startsWith(`${current.path}.`))) {
      return { error: "A category can't be moved inside itself or one of its own sub-categories." };
    }
  }

  const { data: existing } = await supabase
    .from("categories")
    .select("slug")
    .eq("id", categoryId)
    .maybeSingle();

  if (existing && existing.slug !== fields.slug) {
    // Best-effort, same pattern as products: an old link continuing to
    // 404 isn't worth failing the whole category update over.
    await supabase
      .from("category_slug_redirects")
      .insert({ old_slug: existing.slug, category_id: categoryId });
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name: fields.name,
      slug: fields.slug,
      description: fields.description,
      image_path: fields.imagePath,
      parent_id: fields.parentId,
      spec_template_id: fields.specTemplateId,
      is_active: fields.isActive,
    })
    .eq("id", categoryId);

  if (error) {
    if (error.code === "23505") return { error: "A category with this slug already exists." };
    return { error: error.message };
  }

  revalidateCategoryPaths();
  return { success: true };
}

// Checked explicitly rather than left to products.category_id's ON DELETE
// RESTRICT / the parent_id FK's implicit NO ACTION -- both would reject the
// delete either way, but with an unhelpful raw constraint-violation message
// instead of a clear one.
export async function deleteCategory(categoryId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const [{ count: productCount }, { count: childCount }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", categoryId),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", categoryId),
  ]);

  if ((productCount ?? 0) > 0) {
    return { error: "This category still has products in it -- move or reassign them first." };
  }
  if ((childCount ?? 0) > 0) {
    return { error: "This category still has sub-categories -- delete or move those first." };
  }

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: error.message };

  revalidateCategoryPaths();
  return {};
}

export async function toggleCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidateCategoryPaths();
  return {};
}

// Batch sort_order update for a set of siblings after a drag-and-drop
// reorder -- ids are expected already in their new display order.
export async function reorderCategories(orderedIds: string[]): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("categories").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidateCategoryPaths();
  return {};
}

// Reparents a category (drag-drop onto another row) -- the categories_set_path
// / categories_cascade_path triggers (sql/045) handle recomputing this row's
// and every descendant's depth/path automatically.
export async function moveCategory(
  categoryId: string,
  newParentId: string | null,
): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  if (newParentId) {
    const { data: current } = await supabase
      .from("categories")
      .select("path")
      .eq("id", categoryId)
      .maybeSingle();
    const { data: target } = await supabase
      .from("categories")
      .select("path")
      .eq("id", newParentId)
      .maybeSingle();

    if (current && target && (target.path === current.path || target.path.startsWith(`${current.path}.`))) {
      return { error: "A category can't be moved inside itself or one of its own sub-categories." };
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({ parent_id: newParentId })
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidateCategoryPaths();
  return {};
}
