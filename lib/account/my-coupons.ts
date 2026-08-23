"use server";

import { createClient } from "@/lib/supabase/server";
import type { Coupon } from "@/types";

export interface MyCouponGroups {
  available: Coupon[];
  used: (Coupon & { redeemedAt: string })[];
  expired: Coupon[];
}

const EMPTY_GROUPS: MyCouponGroups = { available: [], used: [], expired: [] };

// No existing function returns "which coupons can THIS customer still use"
// (getActiveCoupons in lib/data/coupons.ts is global/unscoped; previewCoupon
// in lib/coupons.ts only validates one entered code) -- this is new,
// read-only, additive logic. It never writes to coupon_redemptions (only
// create_order_atomic does, sql/026-043) and never touches the authoritative
// per-customer-limit check at order creation -- this is purely a display
// categorization of the same two tables that check already reads.
export async function getMyCoupons(): Promise<MyCouponGroups> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_GROUPS;

  const nowIso = new Date().toISOString();

  const [{ data: coupons }, { data: redemptions }] = await Promise.all([
    supabase.from("coupons").select("*").order("expires_at", { ascending: true, nullsFirst: false }),
    supabase.from("coupon_redemptions").select("coupon_id, created_at").eq("user_id", user.id),
  ]);

  // Earliest redemption per coupon, in case usage_limit_per_customer > 1
  // ever allows more than one row for the same coupon -- "used" only needs
  // to know it happened, and when it first did.
  const redeemedAtByCouponId = new Map<string, string>();
  for (const r of redemptions ?? []) {
    const existing = redeemedAtByCouponId.get(r.coupon_id);
    if (!existing || r.created_at < existing) redeemedAtByCouponId.set(r.coupon_id, r.created_at);
  }

  const available: Coupon[] = [];
  const used: (Coupon & { redeemedAt: string })[] = [];
  const expired: Coupon[] = [];

  for (const coupon of coupons ?? []) {
    const redeemedAt = redeemedAtByCouponId.get(coupon.id);
    // A coupon this customer has redeemed at least once is exclusively
    // "Used" -- even if usage_limit_per_customer would technically permit
    // another use, that's not what a customer expects from a "Used" tab.
    if (redeemedAt) {
      used.push({ ...coupon, redeemedAt });
      continue;
    }

    const withinWindow =
      (!coupon.starts_at || coupon.starts_at <= nowIso) && (!coupon.expires_at || coupon.expires_at > nowIso);
    const globallyAvailable = coupon.usage_limit == null || coupon.usage_count < coupon.usage_limit;

    if (coupon.is_active && withinWindow && globallyAvailable) {
      available.push(coupon);
    } else {
      expired.push(coupon);
    }
  }

  return { available, used, expired };
}
