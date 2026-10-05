"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";

export type CategoryFormState = { error: string } | { success: true } | undefined;

function revalidateCategoryPaths() {
  // updateTag FIRST, and it is the one that actually matters.
  // revalidatePath invalidates rendered ROUTES; every storefront read of
  // a category goes through unstable_cache instead (see
  // getCachedCategoryBySlug, getCachedCategories and
  // getCachedCategorySlugsWithProducts in lib/data/cached.ts), and only a
  // tag drops those. Without this line an admin edit sat invisible on the
  // storefront behind the 1-hour TTL -- saving a category looked like it
  // had done nothing. Same mistake, same fix, as lib/admin/settings.ts.
  updateTag(CACHE_TAGS.categories);
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}

function readCategoryFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const description = String(formData.get("description") ?? "").trim() || null;
  // Long-form page copy, a separate field from description on purpose:
  // description is the meta description AND the one-line intro under the
  // h1, so it has to stay short. This is the body text rendered below the
  // product grid. Blank is stored as null, which hides the block.
  const bodyCopy = String(formData.get("bodyCopy") ?? "").trim() || null;
  const imagePath = String(formData.get("imagePath") ?? "").trim() || null;
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();
  const parentId = parentIdRaw || null;
  const specTemplateIdRaw = String(formData.get("specTemplateId") ?? "").trim();
  const specTemplateId = specTemplateIdRaw || null;
  const isActive = formData.get("isActive") === "on";

  return { name, slug, description, bodyCopy, imagePath, parentId, specTemplateId, isActive };
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
    body_copy: fields.bodyCopy,
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
      body_copy: fields.bodyCopy,
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
