import Link from "next/link";
import { BellIcon, StoreIcon, UserIcon } from "@/components/ui/Icon";
import { RangeTabs } from "@/components/admin/dashboard/RangeTabs";
import type { DashboardRange } from "@/lib/admin/dashboard-query";

const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader({
  adminName,
  newOrdersCount,
  range,
  currentParams,
  customFrom,
  customTo,
}: {
  adminName: string;
  newOrdersCount: number;
  range: DashboardRange;
  currentParams: Record<string, string | undefined>;
  customFrom?: string;
  customTo?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0F2D52]">
            {getGreeting()}, {adminName}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders?tab=new"
            aria-label={`${newOrdersCount} new order${newOrdersCount === 1 ? "" : "s"}`}
            className="transition-brand relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white hover:border-[var(--border-hover)]"
          >
            <BellIcon className="h-5 w-5 text-[#0F2D52]" />
            {newOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-discount)] px-1 text-[10px] font-semibold text-white">
                {newOrdersCount}
              </span>
            )}
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-brand flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium hover:border-[var(--border-hover)]"
          >
            <StoreIcon className="h-4 w-4" />
            View Store
          </Link>
          <span className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium">
            <UserIcon className="h-4 w-4 text-[#0F2D52]" />
            {adminName}
          </span>
        </div>
      </div>
      <RangeTabs options={RANGE_OPTIONS} activeValue={range} paramName="range" currentParams={currentParams} />
      {range === "custom" && (
        // Plain GET form, no client JS -- same query-param-driven pattern
        // as RangeTabs, just with two free-form date inputs instead of
        // fixed options.
        <form method="GET" action="/admin" className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-3">
          <input type="hidden" name="range" value="custom" />
          {currentParams.chartRange && (
            <input type="hidden" name="chartRange" value={currentParams.chartRange} />
          )}
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            From
            <input
              type="date"
              name="customFrom"
              defaultValue={customFrom}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-text-secondary)]">
            To
            <input
              type="date"
              name="customTo"
              defaultValue={customTo}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-[var(--radius-sm)] bg-[#0F2D52] px-4 py-1.5 text-sm font-medium text-white transition-brand hover:opacity-90"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
