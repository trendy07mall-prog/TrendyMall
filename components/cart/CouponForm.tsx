"use client";

import { useEffect, useRef, useState } from "react";
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
  const autoPreviewedRef = useRef(false);

  async function handleApply(codeOverride?: string) {
    const code = (codeOverride ?? input).trim();
    if (!code) return;
    setChecking(true);
    setError(null);

    const result = await previewCoupon(code, subtotal, deliveryFee);
    setChecking(false);

    if (result.error || result.discount == null) {
      setError(result.error ?? "Invalid coupon code.");
      onPreview(0, "");
      return;
    }

    applyCoupon(code);
    setLabel(result.label ?? "");
    onPreview(result.discount, result.label ?? "");
  }

  // The cart page's own `discount` state (and this form's `label`) both
  // start empty on every mount — if a coupon was already applied in an
  // earlier visit/session, CartContext still has it, but nothing
  // recomputes the actual discount amount until this runs, so the price
  // breakdown wouldn't otherwise agree with the "Applied" badge below.
  //
  // Keyed on couponCode (not a run-once mount effect): CartContext
  // hydrates its own coupon code from localStorage inside its own effect,
  // which can still be pending on this component's first render (e.g. a
  // hard reload straight on /cart). A mount-only effect would see
  // couponCode as null at that instant and never get another chance to
  // preview it. Tracking the real value (with a ref so it still only
  // ever auto-previews once) fires correctly on whichever render it
  // first becomes available.
  useEffect(() => {
    if (couponCode && !autoPreviewedRef.current) {
      autoPreviewedRef.current = true;
      void handleApply(couponCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode]);

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
          onClick={() => handleApply()}
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
