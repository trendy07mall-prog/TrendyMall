import type { Metadata } from "next";
import { getActiveCoupons } from "@/lib/data/coupons";
import { formatCouponDiscount, formatCouponValidUntil } from "@/lib/coupon-display";
import { formatPrice } from "@/lib/utils";
import { CopyCodeButton } from "@/components/coupon/CopyCodeButton";
import { TicketPercentIcon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Coupons & Offers",
  description: "Every currently active TrendyMall coupon code, in one place.",
  alternates: { canonical: "/coupons" },
};

export default async function CouponsPage() {
  const coupons = await getActiveCoupons();

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12">
      <h1 className="text-h1">Coupons & Offers</h1>
      <p className="mt-2 text-[var(--muted)]">
        Every active coupon code, ready to copy at checkout.
      </p>

      {coupons.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <p className="text-sm text-[var(--muted)]">
            No active coupons available at the moment — check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => {
            const validUntil = formatCouponValidUntil(coupon);
            return (
              <div
                key={coupon.id}
                className="flex flex-col gap-3 rounded-[18px] border border-[var(--border)] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]">
                  <TicketPercentIcon className="h-6 w-6 text-white" />
                </span>
                <h2 className="font-heading text-lg font-bold">
                  {coupon.title || formatCouponDiscount(coupon)}
                </h2>
                {coupon.description && (
                  <p className="text-sm text-[var(--muted)]">{coupon.description}</p>
                )}
                <p className="text-sm font-semibold">{formatCouponDiscount(coupon)}</p>
                {coupon.min_order_value > 0 && (
                  <p className="text-xs text-[var(--muted)]">
                    Minimum order: {formatPrice(coupon.min_order_value)}
                  </p>
                )}
                {validUntil && <p className="text-xs text-[var(--muted)]">{validUntil}</p>}
                <div className="mt-auto pt-2">
                  <CopyCodeButton code={coupon.code} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
