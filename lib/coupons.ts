"use server";

import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export interface CouponPreviewResult {
  discount?: number;
  label?: string;
  error?: string;
}

// A preview only — the coupons_select_valid_or_admin RLS policy (sql/020)
// already restricts this to currently-active, in-date coupons. It is never
// the source of truth: the RPC re-validates and recomputes the real
// discount from scratch at order-creation time regardless of what this
// returns (sql/043).
//
// Usage-limit checks here are best-effort, not authoritative:
// - Total usage_limit: checked directly against coupons.usage_count.
// - Per-customer limit: checked for logged-in customers only, against
//   their own coupon_redemptions (RLS-scoped to their own rows). Guests
//   haven't entered an email/phone yet at this point in the flow — the
//   cart doesn't collect it, checkout does — so there's no identity to
//   check against here. A guest can still see "Applied" in the cart for
//   a coupon they've already used; the RPC is what actually rejects it,
//   at order submission, before anything is created.
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
  if (coupon.usage_limit != null && coupon.usage_count >= coupon.usage_limit) {
    return { error: "This coupon has reached its usage limit." };
  }

  if (coupon.usage_limit_per_customer != null) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { count } = await supabase
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", user.id);
      if ((count ?? 0) >= coupon.usage_limit_per_customer) {
        return { error: "You've already used this coupon." };
      }
    }
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
