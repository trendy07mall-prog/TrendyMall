"use client";

import { useRouter } from "next/navigation";

const selectClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";
const inputClass = `${selectClass} w-24`;

export function ProductFilterBar({
  basePath,
  brands,
  brand,
  minPrice,
  maxPrice,
  inStockOnly,
  sort,
}: {
  basePath: string;
  brands: string[];
  brand: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  sort: string;
}) {
  const router = useRouter();

  function update(
    next: Partial<{
      brand: string;
      minPrice: string;
      maxPrice: string;
      inStockOnly: boolean;
      sort: string;
    }>,
  ) {
    const merged = { brand, minPrice, maxPrice, inStockOnly, sort, ...next };
    const params = new URLSearchParams();
    if (merged.brand) params.set("brand", merged.brand);
    if (merged.minPrice) params.set("minPrice", merged.minPrice);
    if (merged.maxPrice) params.set("maxPrice", merged.maxPrice);
    if (merged.inStockOnly) params.set("inStockOnly", "1");
    if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);

    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
      {brands.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-brand" className="text-xs font-medium text-[var(--muted)]">
            Brand
          </label>
          <select
            id="filter-brand"
            value={brand}
            onChange={(e) => update({ brand: e.target.value })}
            className={selectClass}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-min-price" className="text-xs font-medium text-[var(--muted)]">
          Min price
        </label>
        <input
          id="filter-min-price"
          type="number"
          min="0"
          value={minPrice}
          placeholder="0"
          onChange={(e) => update({ minPrice: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-max-price" className="text-xs font-medium text-[var(--muted)]">
          Max price
        </label>
        <input
          id="filter-max-price"
          type="number"
          min="0"
          value={maxPrice}
          placeholder="Any"
          onChange={(e) => update({ maxPrice: e.target.value })}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => update({ inStockOnly: e.target.checked })}
        />
        In stock only
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-sort" className="text-xs font-medium text-[var(--muted)]">
          Sort by
        </label>
        <select
          id="filter-sort"
          value={sort}
          onChange={(e) => update({ sort: e.target.value })}
          className={selectClass}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}
