"use client";

import { useState } from "react";
import { formatCouponDiscount, formatCouponValidUntil } from "@/lib/coupon-display";
import { formatPrice } from "@/lib/utils";
import { CopyCodeButton } from "@/components/coupon/CopyCodeButton";
import { TicketPercentIcon } from "@/components/ui/Icon";
import type { MyCouponGroups } from "@/lib/account/my-coupons";
import type { Coupon } from "@/types";

type Tab = "available" | "used" | "expired";

const TABS: { value: Tab; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "used", label: "Used" },
  { value: "expired", label: "Expired" },
];

// Same tab-button markup OrderFilterTabs.tsx already established (active
// state, min-h-11, rounded-full) so every tabbed section in the account
// area looks identical -- local state here since, unlike Orders, there's
// no server-side filtering/pagination to drive through the URL: getMyCoupons
// already returns all three groups in one read.
export function CouponsTabs({ groups }: { groups: MyCouponGroups }) {
  const [tab, setTab] = useState<Tab>("available");
  const counts: Record<Tab, number> = {
    available: groups.available.length,
    used: groups.used.length,
    expired: groups.expired.length,
  };

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-current={isActive ? "true" : undefined}
              className={`transition-brand min-h-11 shrink-0 rounded-full px-4 text-sm font-medium whitespace-nowrap ${
                isActive ? "bg-[var(--foreground)] text-white" : "border border-[var(--border)] hover:bg-black/5"
              }`}
            >
              {t.label} ({counts[t.value]})
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "available" && <AvailableList coupons={groups.available} />}
        {tab === "used" && <UsedList coupons={groups.used} />}
        {tab === "expired" && <ExpiredList coupons={groups.expired} />}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
      <p className="text-sm text-[var(--muted)]">{message}</p>
    </div>
  );
}

function CouponCard({ coupon, children }: { coupon: Coupon; children: React.ReactNode }) {
  const validUntil = formatCouponValidUntil(coupon);
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5">
          <TicketPercentIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{coupon.title || formatCouponDiscount(coupon)}</p>
          <p className="text-sm text-[var(--muted)]">{formatCouponDiscount(coupon)}</p>
          {coupon.min_order_value > 0 && (
            <p className="text-xs text-[var(--muted)]">Minimum order: {formatPrice(coupon.min_order_value)}</p>
          )}
          {validUntil && <p className="text-xs text-[var(--muted)]">{validUntil}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function AvailableList({ coupons }: { coupons: Coupon[] }) {
  if (coupons.length === 0) return <EmptyState message="No coupons available for you right now — check back soon." />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {coupons.map((coupon) => (
        <CouponCard key={coupon.id} coupon={coupon}>
          <div className="mt-1">
            <CopyCodeButton code={coupon.code} />
          </div>
        </CouponCard>
      ))}
    </div>
  );
}

function UsedList({ coupons }: { coupons: (Coupon & { redeemedAt: string })[] }) {
  if (coupons.length === 0) return <EmptyState message="You haven't used any coupons yet." />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {coupons.map((coupon) => (
        <CouponCard key={coupon.id} coupon={coupon}>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Used on {new Date(coupon.redeemedAt).toLocaleDateString()}
          </p>
        </CouponCard>
      ))}
    </div>
  );
}

function ExpiredList({ coupons }: { coupons: Coupon[] }) {
  if (coupons.length === 0) return <EmptyState message="No expired coupons." />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-60">
      {coupons.map((coupon) => (
        <CouponCard key={coupon.id} coupon={coupon}>
          <p className="mt-1 text-xs text-[var(--muted)]">No longer available</p>
        </CouponCard>
      ))}
    </div>
  );
}
