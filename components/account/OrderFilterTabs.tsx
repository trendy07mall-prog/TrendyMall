"use client";

import { useRouter } from "next/navigation";
import { accountOrderFilterStateToParams } from "@/lib/account/order-filters";
import type { AccountOrderFilterState, AccountOrderTab } from "@/lib/account/order-filters";

const TABS: { value: AccountOrderTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrderFilterTabs({
  basePath,
  state,
}: {
  basePath: string;
  state: AccountOrderFilterState;
}) {
  const router = useRouter();

  function apply(tab: AccountOrderTab) {
    const qs = accountOrderFilterStateToParams({ ...state, tab }).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="flex gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = state.tab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => apply(tab.value)}
            aria-current={isActive ? "true" : undefined}
            className={`transition-brand min-h-11 shrink-0 rounded-full px-4 text-sm font-medium whitespace-nowrap ${
              isActive ? "bg-[var(--foreground)] text-white" : "border border-[var(--border)] hover:bg-black/5"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
