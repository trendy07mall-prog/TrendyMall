"use client";

import { useState, useTransition } from "react";
import { quickUpdateProduct } from "@/lib/admin/products-mutations";
import { useToast } from "@/components/admin/ToastProvider";

export function QuickEditPrice({
  productId,
  actualPrice,
  specialPrice,
}: {
  productId: string;
  actualPrice: number;
  specialPrice: number | null;
}) {
  const [actual, setActual] = useState(String(actualPrice));
  const [special, setSpecial] = useState(specialPrice != null ? String(specialPrice) : "");
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function commit() {
    const parsedActual = Number(actual);
    const parsedSpecial = special.trim() ? Number(special) : null;
    if (parsedActual === actualPrice && parsedSpecial === specialPrice) return;

    startTransition(async () => {
      const result = await quickUpdateProduct(productId, {
        actualPrice: parsedActual,
        specialPrice: parsedSpecial,
      });
      if ("error" in result) {
        setActual(String(actualPrice));
        setSpecial(specialPrice != null ? String(specialPrice) : "");
        showToast(result.error, "error");
      } else {
        showToast("Price updated");
      }
    });
  }

  const inputClass =
    "w-20 rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] disabled:opacity-50";

  return (
    <div className="flex flex-col gap-1">
      <input
        type="number"
        min="0"
        value={actual}
        disabled={pending}
        onChange={(e) => setActual(e.target.value)}
        onBlur={commit}
        aria-label="Actual price"
        className={inputClass}
      />
      <input
        type="number"
        min="0"
        placeholder="Sale price"
        value={special}
        disabled={pending}
        onChange={(e) => setSpecial(e.target.value)}
        onBlur={commit}
        aria-label="Special price"
        className={`${inputClass} text-[var(--color-discount)]`}
      />
    </div>
  );
}
