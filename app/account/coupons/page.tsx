import type { Metadata } from "next";
import { getMyCoupons } from "@/lib/account/my-coupons";
import { CouponsTabs } from "@/components/account/CouponsTabs";

export const metadata: Metadata = { title: "My Coupons — TrendyMall" };

export default async function AccountCouponsPage() {
  const groups = await getMyCoupons();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">My Coupons</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Coupons you can use, have used, or have expired.
      </p>
      <div className="mt-6">
        <CouponsTabs groups={groups} />
      </div>
    </div>
  );
}
