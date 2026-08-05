"use client";

import { useRouter } from "next/navigation";
import {
  adminOrderFilterStateToParams,
  countActiveAdminOrderFilters,
} from "@/lib/admin/order-filters";
import type {
  AdminOrderFilterState,
  AdminPaymentMethodFilter,
  AdminPaymentStatusFilter,
} from "@/lib/admin/order-filters";
import { PAYMENT_STATUS_LABELS } from "@/components/order/PaymentStatusBadge";
import type { PaymentStatus } from "@/types";

const selectClass =
  "rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const ALL_PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[];

// The order-status filter now lives in the tab strip (OrderStatusTabs) —
// this bar is secondary refiners within whichever tab is active: payment
// method/status, courier, and date range.
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
        value={state.paymentMethod}
        onChange={(e) => apply({ paymentMethod: e.target.value as AdminPaymentMethodFilter })}
        aria-label="Payment method"
      >
        <option value="">All payment methods</option>
        <option value="cod">Cash on Delivery</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="payhere">Card (PayHere)</option>
      </select>

      <select
        className={selectClass}
        value={state.paymentStatus}
        onChange={(e) => apply({ paymentStatus: e.target.value as AdminPaymentStatusFilter })}
        aria-label="Payment status"
      >
        <option value="">All payment statuses</option>
        {ALL_PAYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PAYMENT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={state.courier}
        onChange={(e) => apply({ courier: e.target.value })}
        placeholder="Courier"
        aria-label="Courier"
        className={selectClass}
      />

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
          onClick={() => router.push(state.tab !== "all" ? `${basePath}?tab=${state.tab}` : basePath)}
          className="text-sm text-[var(--muted)] underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
