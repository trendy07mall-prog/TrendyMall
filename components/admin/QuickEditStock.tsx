"use client";

import { useState, useTransition } from "react";
import { quickUpdateProduct } from "@/lib/admin/products-mutations";
import { useToast } from "@/components/admin/ToastProvider";

export function QuickEditStock({ productId, stock }: { productId: string; stock: number }) {
  const [value, setValue] = useState(String(stock));
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function commit() {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed === stock) {
      setValue(String(stock));
      return;
    }
    startTransition(async () => {
      const result = await quickUpdateProduct(productId, { stock: parsed });
      if ("error" in result) {
        setValue(String(stock));
        showToast(result.error, "error");
      } else {
        showToast("Stock updated");
      }
    });
  }

  return (
    <input
      type="number"
      min="0"
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      aria-label="Stock"
      className="w-16 rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] disabled:opacity-50"
    />
  );
}
