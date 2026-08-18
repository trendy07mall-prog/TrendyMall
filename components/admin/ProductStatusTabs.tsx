import Link from "next/link";
import { adminFilterStateToParams } from "@/lib/admin/product-filters";
import type { AdminProductFilterState, AdminStatusFilter } from "@/lib/admin/product-filters";
import type { ProductSummaryCounts } from "@/lib/admin/products-query";

// "Inactive" (a state between Published and Draft), "Pending QC", and
// "Violation" have no backing field anywhere in this schema (products.status
// is only "draft" | "published" -- confirmed by audit, not assumed) --
// these render disabled with "N/A" rather than a fake, clickable "0".
// Pending QC/Violation are marketplace/seller-center concepts TrendyMall's
// single-seller model has no equivalent for.
const DISABLED_TABS = ["Inactive", "Pending QC", "Violation"] as const;

export function ProductStatusTabs({
  basePath,
  state,
  counts,
}: {
  basePath: string;
  state: AdminProductFilterState;
  counts: ProductSummaryCounts;
}) {
  const tabs: { label: string; status: AdminStatusFilter; count: number }[] = [
    { label: "All", status: "", count: counts.total },
    { label: "Active", status: "published", count: counts.active },
    { label: "Draft", status: "draft", count: counts.draft },
    { label: "Deleted", status: "deleted", count: counts.deleted },
  ];

  const tabClass = (isActive: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-brand ${
      isActive
        ? "border-[#0F2D52] bg-[#0F2D52] text-white"
        : "border-[var(--border)] text-[var(--foreground)] hover:bg-black/5"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = state.status === tab.status;
        const params = adminFilterStateToParams({ ...state, status: tab.status }).toString();
        return (
          <Link
            key={tab.label}
            href={params ? `${basePath}?${params}` : basePath}
            className={tabClass(isActive)}
          >
            {tab.label}
            <span className={`ml-1.5 ${isActive ? "text-white/70" : "text-[var(--color-text-secondary)]"}`}>
              {tab.count}
            </span>
          </Link>
        );
      })}
      {DISABLED_TABS.map((label) => (
        <span
          key={label}
          title="Not applicable — TrendyMall has no equivalent to this marketplace concept"
          aria-disabled="true"
          className="shrink-0 cursor-not-allowed rounded-full border border-dashed border-[var(--border)] px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-[var(--muted)] opacity-60"
        >
          {label}
          <span className="ml-1.5">N/A</span>
        </span>
      ))}
    </div>
  );
}
