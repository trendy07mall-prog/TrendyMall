import Link from "next/link";
import { ADMIN_ORDER_TAB_ORDER, ADMIN_ORDER_TAB_LABELS } from "@/lib/admin/orderStatusFlow";
import type { AdminOrderTab } from "@/lib/admin/orderStatusFlow";
import { adminOrderFilterStateToParams } from "@/lib/admin/order-filters";
import type { AdminOrderFilterState } from "@/lib/admin/order-filters";

// Replaces the old "All Orders" status <select> with real tabs — one per
// workflow stage plus All and the low-priority Returned tab, each showing
// a live count. Server-rendered links (no client fetch), same URL-driven
// filter pattern the rest of this page already uses.
export function OrderStatusTabs({
  basePath,
  state,
  counts,
}: {
  basePath: string;
  state: AdminOrderFilterState;
  counts: Record<AdminOrderTab, number>;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
      {ADMIN_ORDER_TAB_ORDER.map((tab) => {
        const isActive = state.tab === tab;
        const qs = adminOrderFilterStateToParams({ ...state, tab }).toString();
        return (
          <Link
            key={tab}
            href={qs ? `${basePath}?${qs}` : basePath}
            className={`transition-brand shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              isActive
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {ADMIN_ORDER_TAB_LABELS[tab]}
            <span className="ml-1.5 text-xs text-[var(--muted)]">{counts[tab]}</span>
          </Link>
        );
      })}
    </div>
  );
}
