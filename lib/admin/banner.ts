"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireAdminClient } from "@/lib/admin/guard";

export type BannerFormState = { error: string } | undefined;

export async function saveBanner(
  _prevState: BannerFormState,
  formData: FormData,
): Promise<BannerFormState> {
  const supabase = await requireAdminClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim();
  const linkUrl = String(formData.get("linkUrl") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";

  if (!message) return { error: "Message is required." };

  const row = { message, link_url: linkUrl, is_active: isActive, updated_at: new Date().toISOString() };

  const { error } = id
    ? await supabase.from("site_banner").update(row).eq("id", id)
    : await supabase.from("site_banner").insert(row);

  if (error) return { error: error.message };

  // revalidatePath invalidates rendered ROUTES; the root layout now
  // reads these through unstable_cache (lib/data/cached.ts), which only
  // a tag drops. Without this an admin edit would sit invisible behind
  // the 1-hour TTL.
  updateTag(CACHE_TAGS.settings);
  revalidatePath("/admin/banner");
  revalidatePath("/");
  return undefined;
}
