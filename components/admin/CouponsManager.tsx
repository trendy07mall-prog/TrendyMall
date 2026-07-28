"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CouponForm } from "@/components/admin/CouponForm";
import { toggleCouponActive } from "@/lib/admin/coupons";
import { useToast } from "@/components/admin/ToastProvider";
import { formatPrice } from "@/lib/utils";
import type { Coupon } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  percentage: "Percentage",
  fixed: "Fixed amount",
  free_shipping: "Free shipping",
};

function formatValue(coupon: Coupon): string {
  if (coupon.type === "percentage") return `${coupon.value}%`;
  if (coupon.type === "fixed") return formatPrice(coupon.value);
  return "—";
}

export function CouponsManager({ coupons }: { coupons: Coupon[] }) {
  const [editing, setEditing] = useState<Coupon | null | "new">(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleToggle(coupon: Coupon) {
    startTransition(async () => {
      const result = await toggleCouponActive(coupon.id, !coupon.is_active);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(coupon.is_active ? "Coupon deactivated" : "Coupon activated");
        router.refresh();
      }
    });
  }

  if (editing !== null) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to coupons
        </button>
        <CouponForm
          coupon={editing === "new" ? null : editing}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditing("new")}
        className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        + New Coupon
      </button>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Value</th>
              <th className="py-2 pr-4">Min. order</th>
              <th className="py-2 pr-4">Usage</th>
              <th className="py-2 pr-4">Expires</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4 font-medium">{coupon.code}</td>
                <td className="py-2 pr-4">{TYPE_LABELS[coupon.type] ?? coupon.type}</td>
                <td className="py-2 pr-4">{formatValue(coupon)}</td>
                <td className="py-2 pr-4">{formatPrice(coupon.min_order_value)}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">
                  {coupon.usage_count}
                  {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}
                </td>
                <td className="py-2 pr-4 text-[var(--muted)]">
                  {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : "—"}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`border px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide ${
                      coupon.is_active ? "border-current" : "border-current text-[var(--muted)]"
                    }`}
                  >
                    {coupon.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(coupon)}
                      className="text-sm underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleToggle(coupon)}
                      className="text-sm underline disabled:opacity-50"
                    >
                      {coupon.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
