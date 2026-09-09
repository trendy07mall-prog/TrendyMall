"use client";

import { formatPrice } from "@/lib/utils";
import type { CustomerSummary } from "@/lib/admin/customer-segments";

// Any of these fields can legitimately contain a comma (a name, a formatted
// price like "LKR 12,500"), which would otherwise shift every later column
// by one in the exported file. Quoting always, and doubling any embedded
// quote, is the RFC-4180 escape and is cheaper than deciding per value.
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// Takes the already-filtered, already-sorted rows the table is displaying,
// so the file matches the screen rather than re-deriving its own view.
export function ExportCustomersButton({ customers }: { customers: CustomerSummary[] }) {
  function handleExport() {
    const header = ["Name", "Contact", "Orders", "Total spent", "Last order"];
    const rows = customers.map((c) =>
      [
        c.name,
        // Both contact points in one column, matching the table's Contact
        // column rather than inventing a shape the screen doesn't have.
        [c.email, c.phone].filter(Boolean).join(" / "),
        String(c.orderCount),
        formatPrice(c.totalSpent),
        new Date(c.lastOrderAt).toLocaleDateString(),
      ].map(csvCell),
    );

    const csv = [header.map(csvCell), ...rows].map((r) => r.join(",")).join("\r\n");
    // The BOM is what makes Excel read this as UTF-8 rather than the local
    // codepage, which otherwise mangles any non-ASCII name.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={customers.length === 0}
      className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50"
    >
      Export CSV
    </button>
  );
}
