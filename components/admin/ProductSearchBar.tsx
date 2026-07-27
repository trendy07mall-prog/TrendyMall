"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/ui/Icon";
import { adminFilterStateToParams } from "@/lib/admin/product-filters";
import type { AdminProductFilterState } from "@/lib/admin/product-filters";

export function ProductSearchBar({
  basePath,
  state,
}: {
  basePath: string;
  state: AdminProductFilterState;
}) {
  const router = useRouter();
  const [value, setValue] = useState(state.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value === state.search) return;
      const qs = adminFilterStateToParams({ ...state, search: value }).toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative flex-1 md:max-w-sm">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products by name, SKU, brand…"
        aria-label="Search products"
        className="w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-[var(--foreground)] focus:ring-1 focus:ring-[var(--foreground)]"
      />
    </div>
  );
}
