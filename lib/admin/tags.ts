"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { slugify } from "@/lib/utils";

export type TagFormState = { error: string } | { success: true } | undefined;

function revalidateTagPaths() {
  revalidatePath("/admin/tags");
  revalidatePath("/", "layout");
}

function readTagFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);
  const isActive = formData.get("isActive") === "on";

  return { name, slug, isActive };
}

export async function createTag(
  _prevState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  const supabase = await requireAdminClient();
  const fields = readTagFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase.from("tags").insert({
    name: fields.name,
    slug: fields.slug,
    is_active: fields.isActive,
  });

  if (error) {
    if (error.code === "23505") return { error: "A tag with this slug already exists." };
    return { error: error.message };
  }

  revalidateTagPaths();
  return { success: true };
}

export async function updateTag(
  tagId: string,
  _prevState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  const supabase = await requireAdminClient();
  const fields = readTagFields(formData);
  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase
    .from("tags")
    .update({ name: fields.name, slug: fields.slug, is_active: fields.isActive })
    .eq("id", tagId);

  if (error) {
    if (error.code === "23505") return { error: "A tag with this slug already exists." };
    return { error: error.message };
  }

  revalidateTagPaths();
  return { success: true };
}

// Checked explicitly rather than left to product_tags.tag_id's ON DELETE
// CASCADE -- a cascade would silently untag every product; a clear error
// asking the admin to reassign first is safer for something merchandising
// might be actively relying on.
export async function deleteTag(tagId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const { count: productCount } = await supabase
    .from("product_tags")
    .select("product_id", { count: "exact", head: true })
    .eq("tag_id", tagId);

  if ((productCount ?? 0) > 0) {
    return { error: "This tag is still assigned to products -- remove it from them first." };
  }

  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) return { error: error.message };

  revalidateTagPaths();
  return {};
}

export async function toggleTagActive(tagId: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("tags").update({ is_active: isActive }).eq("id", tagId);

  if (error) return { error: error.message };
  revalidateTagPaths();
  return {};
}

export async function reorderTags(orderedIds: string[]): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("tags").update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidateTagPaths();
  return {};
}

// Replaces a product's full tag set in one call -- delete-then-insert, same
// shape as replaceProductImages/replaceProductVariants in lib/admin/products.ts.
export async function setProductTags(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  productId: string,
  tagIds: string[],
): Promise<void> {
  await supabase.from("product_tags").delete().eq("product_id", productId);
  if (tagIds.length === 0) return;

  const rows = tagIds.map((tag_id) => ({ product_id: productId, tag_id }));
  const { error } = await supabase.from("product_tags").insert(rows);
  if (error) throw new Error(error.message);
}
