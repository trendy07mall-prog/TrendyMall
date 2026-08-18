"use client";

import { useState, useTransition } from "react";
import { quickUpdateVariantActive } from "@/lib/admin/products-mutations";
import { useToast } from "@/components/admin/ToastProvider";

// Same optimistic-toggle/revert/toast mechanics as QuickEditFeatured, just
// rendered as a real switch (track + thumb) instead of an icon button --
// the button itself is a full 44x44px tap target even though the visible
// track is smaller, per this project's mobile touch-target rule.
export function QuickEditVariantActive({
  variantId,
  isActive,
  onToggled,
}: {
  variantId: string;
  isActive: boolean;
  // Optional -- lets a parent that shows its own derived status badge next
  // to this toggle (the products-table variant panel) stay in sync without
  // this component needing to know that badge exists. Existing callers that
  // don't pass it see zero behavior change.
  onToggled?: (next: boolean) => void;
}) {
  const [value, setValue] = useState(isActive);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function toggle() {
    const previous = value;
    const next = !value;
    setValue(next);
    startTransition(async () => {
      const result = await quickUpdateVariantActive(variantId, next);
      if ("error" in result) {
        setValue(previous);
        showToast(result.error, "error");
      } else {
        showToast(next ? "Variant activated" : "Variant deactivated");
        onToggled?.(next);
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={value ? "Deactivate variant" : "Activate variant"}
      onClick={toggle}
      disabled={pending}
      className="flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          value ? "bg-[var(--color-success)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-[var(--shadow-card)] transition-transform ${
            value ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </span>
    </button>
  );
}
