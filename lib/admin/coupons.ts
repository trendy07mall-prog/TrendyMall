"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import type { CouponType } from "@/types";

export type CouponFormState = { error: string } | undefined;

const COUPON_TYPES: CouponType[] = ["percentage", "fixed", "free_shipping"];

// Create-or-update by presence of a hidden id — same convention as
// saveBankTransferSettings/saveBanner. No delete function exists here:
// coupon_redemptions.coupon_id is ON DELETE CASCADE, so a hard delete
// would destroy the discount history tied to real past orders — the
// same class of mistake this whole project's soft-delete rule exists to
// prevent. The only "removal" action is deactivating (see
// toggleCouponActive below).
export async function saveCoupon(
  _prevState: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const supabase = await requireAdminClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const title = String(formData.get("title") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const typeRaw = String(formData.get("type") ?? "");
  const value = Number(formData.get("value") ?? 0);
  const minOrderValue = Number(formData.get("minOrderValue") ?? 0);
  const maxDiscountAmountRaw = String(formData.get("maxDiscountAmount") ?? "").trim();
  const usageLimitRaw = String(formData.get("usageLimit") ?? "").trim();
  const usageLimitPerCustomerRaw = String(formData.get("usageLimitPerCustomer") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!code) return { error: "Coupon code is required." };
  if (!COUPON_TYPES.includes(typeRaw as CouponType)) {
    return { error: "Select a coupon type." };
  }
  const type = typeRaw as CouponType;
  if (type === "percentage" && (value <= 0 || value > 100)) {
    return { error: "Percentage must be between 1 and 100." };
  }
  if (type === "fixed" && value <= 0) {
    return { error: "Fixed amount must be greater than 0." };
  }

  const row = {
    code,
    title,
    description,
    type,
    value: type === "free_shipping" ? 0 : value,
    min_order_value: minOrderValue,
    max_discount_amount:
      type === "percentage" && maxDiscountAmountRaw ? Number(maxDiscountAmountRaw) : null,
    usage_limit: usageLimitRaw ? Number(usageLimitRaw) : null,
    usage_limit_per_customer: usageLimitPerCustomerRaw ? Number(usageLimitPerCustomerRaw) : null,
    starts_at: startsAtRaw ? new Date(startsAtRaw).toISOString() : null,
    expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("coupons").update(row).eq("id", id)
    : await supabase.from("coupons").insert(row);

  if (error) {
    if (error.code === "23505") return { error: "A coupon with this code already exists." };
    return { error: error.message };
  }

  revalidatePath("/admin/coupons");
  return undefined;
}

export async function toggleCouponActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase
    .from("coupons")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/coupons");
  return {};
}
