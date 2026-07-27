"use client";

import { useState, useTransition } from "react";
import { quickUpdateProduct } from "@/lib/admin/products-mutations";
import { useToast } from "@/components/admin/ToastProvider";
import { StarIcon } from "@/components/ui/Icon";

export function QuickEditFeatured({
  productId,
  isFeatured,
}: {
  productId: string;
  isFeatured: boolean;
}) {
  const [value, setValue] = useState(isFeatured);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function toggle() {
    const previous = value;
    const next = !value;
    setValue(next);
    startTransition(async () => {
      const result = await quickUpdateProduct(productId, { isFeatured: next });
      if ("error" in result) {
        setValue(previous);
        showToast(result.error, "error");
      } else {
        showToast(next ? "Marked as featured" : "Removed from featured");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={value}
      aria-label={value ? "Remove from featured" : "Mark as featured"}
      className="transition-brand flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-50"
    >
      <StarIcon className="h-4 w-4" filled={value} />
    </button>
  );
}
