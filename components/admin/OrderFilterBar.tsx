"use client";

import { useRouter } from "next/navigation";
import {
  adminOrderFilterStateToParams,
  countActiveAdminOrderFilters,
} from "@/lib/admin/order-filters";
import type {
  AdminOrderFilterState,
  AdminOrderStatusFilter,
  AdminPaymentMethodFilter,
} from "@/lib/admin/order-filters";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import type { OrderFulfillmentStatus } from "@/types";

const selectClass =
  "rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const ALL_ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderFulfillmentStatus[];

export function OrderFilterBar({
  basePath,
  state,
}: {
  basePath: string;
  state: AdminOrderFilterState;
}) {
  const router = useRouter();

  function apply(next: Partial<AdminOrderFilterState>) {
    const qs = adminOrderFilterStateToParams({ ...state, ...next }).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const activeCount = countActiveAdminOrderFilters(state);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className={selectClass}
        value={state.orderStatus}
        onChange={(e) => apply({ orderStatus: e.target.value as AdminOrderStatusFilter })}
        aria-label="Order status"
      >
        <option value="">All statuses</option>
        {ALL_ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={state.paymentMethod}
        onChange={(e) => apply({ paymentMethod: e.target.value as AdminPaymentMethodFilter })}
        aria-label="Payment method"
      >
        <option value="">All payment methods</option>
        <option value="cod">Cash on Delivery</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="payhere">Card (PayHere)</option>
      </select>

      <label className="flex items-center gap-2 text-sm">
        From
        <input
          type="date"
          value={state.dateFrom}
          onChange={(e) => apply({ dateFrom: e.target.value })}
          className={selectClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        To
        <input
          type="date"
          value={state.dateTo}
          onChange={(e) => apply({ dateTo: e.target.value })}
          className={selectClass}
        />
      </label>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="text-sm text-[var(--muted)] underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
