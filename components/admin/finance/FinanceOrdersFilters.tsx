"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  financeOrderFilterStateToParams,
  countActiveFinanceOrderFilters,
  type FinanceOrderFilterState,
} from "@/lib/admin/finance-filters";
import type { FinanceRangeState } from "@/lib/admin/finance-filters";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import { PAYMENT_STATUS_LABELS } from "@/components/order/PaymentStatusBadge";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import type { OrderFulfillmentStatus, PaymentGateway, PaymentStatus } from "@/types";

const selectClass =
  "rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const ALL_ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderFulfillmentStatus[];
const ALL_PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[];
const ALL_PAYMENT_METHODS: PaymentGateway[] = ["cod", "bank_transfer", "payhere"];

// Only statuses/methods that actually exist in this system (pulled from the
// same label maps every other admin order view already uses) -- never a
// hand-typed list that could drift from the real enum.
export function FinanceOrdersFilters({
  rangeState,
  filters,
}: {
  rangeState: FinanceRangeState;
  filters: FinanceOrderFilterState;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function apply(next: Partial<FinanceOrderFilterState>) {
    const merged = { ...filters, ...next };
    const params = financeOrderFilterStateToParams(rangeState, merged);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    const params = financeOrderFilterStateToParams(rangeState, {
      search: "",
      orderStatus: "",
      paymentStatus: "",
      paymentMethod: "",
    });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const activeCount = countActiveFinanceOrderFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        defaultValue={filters.search}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply({ search: (e.target as HTMLInputElement).value });
        }}
        onBlur={(e) => apply({ search: e.target.value })}
        placeholder="Search order #"
        aria-label="Search order number"
        className={selectClass}
      />

      <select
        className={selectClass}
        value={filters.orderStatus}
        onChange={(e) => apply({ orderStatus: e.target.value as FinanceOrderFilterState["orderStatus"] })}
        aria-label="Order status"
      >
        <option value="">All order statuses</option>
        {ALL_ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.paymentStatus}
        onChange={(e) => apply({ paymentStatus: e.target.value as FinanceOrderFilterState["paymentStatus"] })}
        aria-label="Payment status"
      >
        <option value="">All payment statuses</option>
        {ALL_PAYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PAYMENT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.paymentMethod}
        onChange={(e) => apply({ paymentMethod: e.target.value as FinanceOrderFilterState["paymentMethod"] })}
        aria-label="Payment method"
      >
        <option value="">All payment methods</option>
        {ALL_PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {PAYMENT_METHOD_LABELS[m]}
          </option>
        ))}
      </select>

      {activeCount > 0 && (
        <button type="button" onClick={clearAll} className="text-sm text-[var(--muted)] underline">
          Clear Filters
        </button>
      )}
    </div>
  );
}
