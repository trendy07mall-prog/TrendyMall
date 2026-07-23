"use client";

import { useState } from "react";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function PricingFields({
  defaultActualPrice,
  defaultSpecialPrice,
}: {
  defaultActualPrice?: number;
  defaultSpecialPrice?: number | null;
}) {
  const [onSale, setOnSale] = useState(
    defaultSpecialPrice !== undefined && defaultSpecialPrice !== null,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="actualPrice" className="text-sm font-medium">
          Price (LKR)
        </label>
        <input
          id="actualPrice"
          name="actualPrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultActualPrice}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(e) => setOnSale(e.target.checked)}
          />
          On sale?
        </label>
        {onSale && (
          <input
            name="specialPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultSpecialPrice ?? undefined}
            placeholder="Special price (LKR)"
            className={inputClass}
          />
        )}
      </div>
    </div>
  );
}
