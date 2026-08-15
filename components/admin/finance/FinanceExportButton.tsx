"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { exportFinanceOrdersCsv } from "@/lib/admin/finance-export";
import { parseFinanceRangeState, parseFinanceOrderFilterState } from "@/lib/admin/finance-filters";

// Lives once in the Finance layout header (same reasoning as
// FinanceDateRangePicker: layouts never receive a searchParams prop, so
// this reads its own state from useSearchParams()) and always exports
// orders -- the one underlying dataset every Finance tab is a view onto.
// On Overview/Payments there are no order-specific filters active in the
// URL, so it naturally exports every order in the selected range; on the
// Orders tab it additionally respects whatever filters are active there,
// satisfying "CSV of the currently filtered view" from every tab uniformly.
export function FinanceExportButton() {
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();

  async function handleExport() {
    setPending(true);
    const sp = Object.fromEntries(searchParams.entries());
    const rangeState = parseFinanceRangeState(sp);
    const filters = parseFinanceOrderFilterState(sp);
    const csv = await exportFinanceOrdersCsv(rangeState.range, rangeState.customFrom, rangeState.customTo, filters);
    setPending(false);

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trendymall-finance-orders.csv";
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
      {pending ? "Exporting…" : "Export Report"}
    </button>
  );
}
