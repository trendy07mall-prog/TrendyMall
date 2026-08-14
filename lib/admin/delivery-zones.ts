"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";

export type DeliveryZoneFormState = { error: string } | undefined;

function revalidateZones() {
  revalidatePath("/admin/settings/shipping");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

// Create-or-update by presence of a hidden id, same convention as
// saveHeroSlide/saveCampaign. Only one zone may be the default/catch-all
// at a time -- saving a zone with isDefault=true clears the flag on every
// other zone first, so the matching logic (both here in TS and in
// create_order_atomic) never has to pick between two ambiguous defaults.
export async function saveDeliveryZone(
  _prevState: DeliveryZoneFormState,
  formData: FormData,
): Promise<DeliveryZoneFormState> {
  const supabase = await requireAdminClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const postalCodeStart = String(formData.get("postalCodeStart") ?? "").trim() || null;
  const postalCodeEnd = String(formData.get("postalCodeEnd") ?? "").trim() || null;
  const districtMatch = String(formData.get("districtMatch") ?? "").trim() || null;
  const rateRaw = String(formData.get("rate") ?? "").trim();
  const isDefault = formData.get("isDefault") === "on";
  const status: "active" | "inactive" =
    String(formData.get("status") ?? "active") === "inactive" ? "inactive" : "active";

  if (!name) return { error: "Zone name is required." };
  const rate = Number(rateRaw);
  if (!Number.isFinite(rate) || rate < 0) return { error: "Enter a valid delivery rate." };
  if ((postalCodeStart && !postalCodeEnd) || (!postalCodeStart && postalCodeEnd)) {
    return { error: "Provide both a start and end postal code, or leave both blank for a catch-all zone." };
  }
  if (postalCodeStart && postalCodeEnd && postalCodeStart > postalCodeEnd) {
    return { error: "The start postal code must come before the end postal code." };
  }

  let sortOrder = 0;
  if (!id) {
    const { count } = await supabase.from("delivery_zones").select("id", { count: "exact", head: true });
    sortOrder = count ?? 0;
  }

  if (isDefault) {
    await supabase.from("delivery_zones").update({ is_default: false }).eq("is_default", true);
  }

  const row = {
    name,
    postal_code_start: postalCodeStart,
    postal_code_end: postalCodeEnd,
    district_match: districtMatch,
    rate,
    is_default: isDefault,
    status,
    updated_at: new Date().toISOString(),
    ...(id ? {} : { sort_order: sortOrder }),
  };

  const { error } = id
    ? await supabase.from("delivery_zones").update(row).eq("id", id)
    : await supabase.from("delivery_zones").insert(row);

  if (error) return { error: error.message };

  revalidateZones();
  return undefined;
}

export async function toggleDeliveryZoneStatus(
  id: string,
  newStatus: "active" | "inactive",
): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  if (newStatus === "inactive") {
    const { data: zone } = await supabase.from("delivery_zones").select("is_default").eq("id", id).maybeSingle();
    if (zone?.is_default) {
      return { error: "Can't disable the default/catch-all zone — set a different zone as default first." };
    }
  }

  const { error } = await supabase
    .from("delivery_zones")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateZones();
  return {};
}

export async function reorderDeliveryZones(orderedIds: string[]): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("delivery_zones").update({ sort_order: index }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  revalidateZones();
  return {};
}

// Blocked from removing the default/catch-all zone (both matchZone in
// lib/delivery-fee.ts and create_order_atomic fall back to it whenever no
// specific zone matches) -- deleting it wouldn't break checkout (both
// have a final hardcoded 400 safety net) but would silently make every
// non-Colombo order use an undocumented fallback rate instead of the
// admin's own configured default.
export async function deleteDeliveryZone(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();

  const { data: zone } = await supabase.from("delivery_zones").select("is_default").eq("id", id).maybeSingle();
  if (zone?.is_default) {
    return { error: "Can't delete the default/catch-all zone — set a different zone as default first." };
  }

  const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateZones();
  return {};
}
