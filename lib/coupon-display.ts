import { formatPrice } from "@/lib/utils";
import type { Coupon } from "@/types";

// Pure display formatting — no data fetching, so both server components
// (the homepage card, /coupons) and client components (CopyCodeButton's
// siblings) can import it safely.
export function formatCouponDiscount(coupon: Coupon): string {
  if (coupon.type === "free_shipping") return "Free shipping";
  if (coupon.type === "fixed") return `${formatPrice(coupon.value)} off`;
  return coupon.max_discount_amount != null
    ? `${coupon.value}% off (up to ${formatPrice(coupon.max_discount_amount)})`
    : `${coupon.value}% off`;
}

export function formatCouponValidUntil(coupon: Coupon): string | null {
  if (!coupon.expires_at) return null;
  return `Valid until ${new Date(coupon.expires_at).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}
