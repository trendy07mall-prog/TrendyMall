"use client";

import { useState } from "react";
import { exportProductsCsv } from "@/lib/admin/products-export";
import type { AdminProductFilterState } from "@/lib/admin/product-filters";

export function ExportProductsButton({ filters }: { filters: AdminProductFilterState }) {
  const [pending, setPending] = useState(false);

  async function handleExport() {
    setPending(true);
    const csv = await exportProductsCsv(filters);
    setPending(false);

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trendymall-products-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={pending}
      className="transition-brand rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
    >
      {pending ? "Exporting…" : "Export CSV"}
    </button>
  );
}
