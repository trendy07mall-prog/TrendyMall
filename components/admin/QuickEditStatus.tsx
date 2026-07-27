"use client";

import { useState, useTransition } from "react";
import { quickUpdateProduct } from "@/lib/admin/products-mutations";
import { useToast } from "@/components/admin/ToastProvider";
import type { ProductStatus } from "@/types";

export function QuickEditStatus({
  productId,
  status,
}: {
  productId: string;
  status: ProductStatus;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleChange(next: ProductStatus) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await quickUpdateProduct(productId, { status: next });
      if ("error" in result) {
        setValue(previous);
        showToast(result.error, "error");
      } else {
        showToast("Status updated");
      }
    });
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as ProductStatus)}
      aria-label="Status"
      className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] disabled:opacity-50"
    >
      <option value="published">Published</option>
      <option value="draft">Draft</option>
    </select>
  );
}
