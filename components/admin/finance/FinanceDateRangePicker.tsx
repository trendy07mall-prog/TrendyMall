"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FINANCE_RANGE_LABELS, type FinanceRange } from "@/lib/admin/finance-shared";
import type { FinanceRangeState } from "@/lib/admin/finance-filters";
import { DateTimePicker } from "@/components/admin/DateTimePicker";

const RANGES = Object.keys(FINANCE_RANGE_LABELS) as FinanceRange[];

const selectClass =
  "rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Lives once in the Finance layout header and drives every sub-page
// (Overview/Orders/Payments) via the URL. It's fully self-contained --
// reads its own state from useSearchParams() rather than a prop -- because
// Next.js layouts (unlike pages) never receive a `searchParams` prop, so a
// server-rendered layout has no way to hand this down. Only range/from/to
// change on apply; every other active searchParam (Orders-tab filters,
// page number) is preserved untouched.
export function FinanceDateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state: FinanceRangeState = {
    range: (RANGES as string[]).includes(searchParams.get("range") ?? "")
      ? (searchParams.get("range") as FinanceRange)
      : "30d",
    customFrom: searchParams.get("from") ?? "",
    customTo: searchParams.get("to") ?? "",
  };

  function apply(next: Partial<FinanceRangeState>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...state, ...next };

    if (merged.range && merged.range !== "30d") params.set("range", merged.range);
    else params.delete("range");

    if (merged.range === "custom") {
      if (merged.customFrom) params.set("from", merged.customFrom);
      else params.delete("from");
      if (merged.customTo) params.set("to", merged.customTo);
      else params.delete("to");
    } else {
      params.delete("from");
      params.delete("to");
    }

    // A new range invalidates whatever page of results was previously
    // showing -- start back at page 1 rather than landing on a now
    // out-of-bounds page.
    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={state.range}
        onChange={(e) => apply({ range: e.target.value as FinanceRange })}
        aria-label="Date range"
      >
        {RANGES.map((r) => (
          <option key={r} value={r}>
            {FINANCE_RANGE_LABELS[r]}
          </option>
        ))}
      </select>

      {state.range === "custom" && (
        <>
          <label className="flex items-center gap-2 text-sm">
            From
            <DateTimePicker
              mode="date"
              value={state.customFrom}
              onChange={(v) => apply({ customFrom: v })}
              placeholder="Any"
              aria-label="Finance range from"
              className="flex w-40 items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-left text-sm transition-colors hover:border-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            To
            <DateTimePicker
              mode="date"
              value={state.customTo}
              onChange={(v) => apply({ customTo: v })}
              placeholder="Any"
              aria-label="Finance range to"
              className="flex w-40 items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-left text-sm transition-colors hover:border-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        </>
      )}
    </div>
  );
}
