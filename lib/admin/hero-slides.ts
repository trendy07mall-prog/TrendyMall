"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { sriLankaInputToUtcIso } from "@/lib/campaign-datetime";

export type HeroSlideFormState = { error: string } | undefined;

function revalidateHero() {
  revalidatePath("/admin/settings/homepage");
  revalidatePath("/", "layout");
}

// Create-or-update by presence of a hidden id, same convention as
// saveCampaign/saveCoupon. Status is set via two submit buttons ("Save as
// Draft" / "Publish"), same convention as CampaignForm.tsx, not a dropdown.
export async function saveHeroSlide(
  _prevState: HeroSlideFormState,
  formData: FormData,
): Promise<HeroSlideFormState> {
  const supabase = await requireAdminClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const buttonText = String(formData.get("buttonText") ?? "").trim() || null;
  const buttonLink = String(formData.get("buttonLink") ?? "").trim() || null;
  const desktopImageUrl = String(formData.get("desktopImageUrl") ?? "").trim();
  const mobileImageUrl = String(formData.get("mobileImageUrl") ?? "").trim();
  const startAtRaw = String(formData.get("startAt") ?? "").trim();
  const endAtRaw = String(formData.get("endAt") ?? "").trim();
  const status: "draft" | "published" =
    String(formData.get("status") ?? "draft") === "published" ? "published" : "draft";

  if (!title) return { error: "Title is required." };
  if (!desktopImageUrl) return { error: "Desktop image is required." };
  if (!mobileImageUrl) return { error: "Mobile image is required." };

  let startAt: string | null = null;
  if (startAtRaw) {
    startAt = sriLankaInputToUtcIso(startAtRaw);
    if (!startAt) return { error: "Invalid start date/time." };
  }

  let endAt: string | null = null;
  if (endAtRaw) {
    endAt = sriLankaInputToUtcIso(endAtRaw);
    if (!endAt) return { error: "Invalid end date/time." };
    if (startAt && new Date(endAt) <= new Date(startAt)) {
      return { error: "End date must be after the start date." };
    }
  }

  // New slides append to the end of the list by default -- reordering
  // happens explicitly afterward via reorderHeroSlides, same as how a new
  // category starts at the end of its siblings.
  let sortOrder = 0;
  if (!id) {
    const { count } = await supabase
      .from("hero_slides")
      .select("id", { count: "exact", head: true });
    sortOrder = count ?? 0;
  }

  const row = {
    title,
    subtitle,
    button_text: buttonText,
    button_link: buttonLink,
    desktop_image_url: desktopImageUrl,
    mobile_image_url: mobileImageUrl,
    status,
    start_at: startAt,
    end_at: endAt,
    updated_at: new Date().toISOString(),
    ...(id ? {} : { sort_order: sortOrder }),
  };

  const { error } = id
    ? await supabase.from("hero_slides").update(row).eq("id", id)
    : await supabase.from("hero_slides").insert(row);

  if (error) return { error: error.message };

  revalidateHero();
  return undefined;
}

// Quick publish/disable from the list view, mirrors toggleCampaignStatus.
export async function toggleHeroSlideStatus(
  id: string,
  newStatus: "draft" | "published" | "disabled",
): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("hero_slides")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateHero();
  return {};
}

// Batch sort_order update after an up/down move, same shape as
// reorderCategories -- ids are expected already in their new display order.
export async function reorderHeroSlides(orderedIds: string[]): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("hero_slides").update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidateHero();
  return {};
}

// Unlike campaigns/coupons, nothing in the schema references hero_slides
// (no order/pricing history tied to a slide), so a real hard delete is
// safe here -- confirmed via the Phase 2 audit before this was written.
export async function deleteHeroSlide(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("hero_slides").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateHero();
  return {};
}
