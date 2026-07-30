"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { previewCoupon } from "@/lib/coupons";
import { PercentIcon } from "@/components/ui/Icon";

export function CouponForm({
  subtotal,
  deliveryFee,
  onPreview,
}: {
  subtotal: number;
  deliveryFee: number;
  onPreview: (discount: number, label: string) => void;
}) {
  const { couponCode, applyCoupon, removeCoupon } = useCart();
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  async function handleApply() {
    if (!input.trim()) return;
    setChecking(true);
    setError(null);

    const result = await previewCoupon(input.trim(), subtotal, deliveryFee);
    setChecking(false);

    if (result.error || result.discount == null) {
      setError(result.error ?? "Invalid coupon code.");
      return;
    }

    applyCoupon(input.trim());
    setLabel(result.label ?? "");
    onPreview(result.discount, result.label ?? "");
  }

  function handleRemove() {
    removeCoupon();
    setInput("");
    setLabel(null);
    setError(null);
    onPreview(0, "");
  }

  if (couponCode) {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-black/5 px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <PercentIcon className="h-4 w-4" />
          <strong>{couponCode}</strong> {label && `— ${label}`}
        </span>
        <button type="button" onClick={handleRemove} className="text-xs underline">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <PercentIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Coupon code"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent py-2 pr-3 pl-9 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={checking || !input.trim()}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Apply"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
