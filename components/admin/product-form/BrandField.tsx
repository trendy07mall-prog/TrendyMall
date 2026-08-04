"use client";

import { useState } from "react";
import type { Brand } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const NEW_BRAND_VALUE = "__new__";

export function BrandField({
  brands,
  defaultBrandId,
}: {
  brands: Brand[];
  defaultBrandId?: string | null;
}) {
  const [selected, setSelected] = useState(defaultBrandId ?? "");
  const isNewBrand = selected === NEW_BRAND_VALUE;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="brandId" className="text-sm font-medium">
        Brand
      </label>
      <select
        id="brandId"
        name="brandId"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className={inputClass}
      >
        <option value="">— None —</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
        <option value={NEW_BRAND_VALUE}>+ Add new brand</option>
      </select>

      {isNewBrand && (
        <input
          name="newBrandName"
          type="text"
          required
          placeholder="New brand name"
          className={`${inputClass} mt-2`}
        />
      )}
    </div>
  );
}
