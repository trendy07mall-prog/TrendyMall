"use server";

import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export interface CouponPreviewResult {
  discount?: number;
  label?: string;
  error?: string;
}

// A preview only — the coupons_select_valid_or_admin RLS policy (sql/020)
// already restricts this to currently-active, in-date coupons, so this
// re-implements the same discount math as create_order_atomic (sql/026)
// purely to show the customer an estimate before they submit. It is never
// the source of truth: the RPC re-validates and recomputes the real
// discount from scratch at order-creation time regardless of what this
// returns, including usage limits this function doesn't check at all.
export async function previewCoupon(
  code: string,
  subtotal: number,
  deliveryFee: number,
): Promise<CouponPreviewResult> {
  const trimmed = code.trim();
  if (!trimmed) return { error: "Enter a coupon code." };

  const supabase = await createClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", trimmed)
    .maybeSingle();

  if (!coupon) return { error: "Invalid coupon code." };
  if (subtotal < coupon.min_order_value) {
    return { error: `This coupon requires a minimum order of ${formatPrice(coupon.min_order_value)}.` };
  }

  if (coupon.type === "percentage") {
    const discount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
    return { discount, label: `${coupon.value}% off` };
  }
  if (coupon.type === "fixed") {
    return { discount: Math.min(coupon.value, subtotal), label: `${formatPrice(coupon.value)} off` };
  }
  return { discount: deliveryFee, label: "Free shipping" };
}
