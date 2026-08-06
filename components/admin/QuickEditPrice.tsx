"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { quickUpdateVariantPrice } from "@/lib/admin/products-mutations";
import { useToast } from "@/components/admin/ToastProvider";

// Only meaningful for a single-variant product -- editing "the price" from
// a flat table cell is ambiguous the moment a product has more than one
// variant, so that case links to the full editor instead of guessing which
// row a table cell should mean.
export function QuickEditPrice({
  productId,
  variantId,
  regularPrice,
  salePrice,
  hasMultiplePrices,
}: {
  productId: string;
  variantId: string;
  regularPrice: number;
  salePrice: number | null;
  hasMultiplePrices: boolean;
}) {
  const [regular, setRegular] = useState(String(regularPrice));
  const [sale, setSale] = useState(salePrice != null ? String(salePrice) : "");
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  if (hasMultiplePrices) {
    return (
      <Link href={`/admin/products/${productId}/edit`} className="text-xs underline">
        Edit variants →
      </Link>
    );
  }

  function commit() {
    const parsedRegular = Number(regular);
    const parsedSale = sale.trim() ? Number(sale) : null;
    if (parsedRegular === regularPrice && parsedSale === salePrice) return;

    startTransition(async () => {
      const result = await quickUpdateVariantPrice(variantId, {
        regularPrice: parsedRegular,
        salePrice: parsedSale,
      });
      if ("error" in result) {
        setRegular(String(regularPrice));
        setSale(salePrice != null ? String(salePrice) : "");
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
        value={regular}
        disabled={pending}
        onChange={(e) => setRegular(e.target.value)}
        onBlur={commit}
        aria-label="Regular price"
        className={inputClass}
      />
      <input
        type="number"
        min="0"
        placeholder="Sale price"
        value={sale}
        disabled={pending}
        onChange={(e) => setSale(e.target.value)}
        onBlur={commit}
        aria-label="Sale price"
        className={`${inputClass} text-[var(--color-discount)]`}
      />
    </div>
  );
}
