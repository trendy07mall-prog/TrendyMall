// Mirrors lib/admin/order-filters.ts's shape/pattern -- same
// URL-searchParam-driven state, split into two concerns: the shared date
// range (read on every Finance sub-page, drives Overview/Orders/Payments
// alike) and the Orders-tab-only refiners (status/method/search).

import type { OrderFulfillmentStatus, PaymentGateway, PaymentStatus } from "@/types";
import type { FinanceRange } from "@/lib/admin/finance-shared";
import { FINANCE_RANGE_LABELS } from "@/lib/admin/finance-shared";

const ORDER_STATUSES: OrderFulfillmentStatus[] = [
  "pending",
  "confirmed",
  "packing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "failed_delivery",
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "awaiting_verification",
  "paid",
  "failed",
  "cancelled",
  "refunded",
];
const PAYMENT_METHODS: PaymentGateway[] = ["cod", "bank_transfer", "payhere"];
const RANGES = Object.keys(FINANCE_RANGE_LABELS) as FinanceRange[];

export interface FinanceRangeState {
  range: FinanceRange;
  customFrom: string;
  customTo: string;
}

export function parseFinanceRangeState(sp: Record<string, string | string[] | undefined>): FinanceRangeState {
  const get = (key: string): string => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const rangeRaw = get("range");
  return {
    range: (RANGES as string[]).includes(rangeRaw) ? (rangeRaw as FinanceRange) : "30d",
    customFrom: get("from"),
    customTo: get("to"),
  };
}

export function financeRangeStateToParams(state: FinanceRangeState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.range && state.range !== "30d") params.set("range", state.range);
  if (state.range === "custom") {
    if (state.customFrom) params.set("from", state.customFrom);
    if (state.customTo) params.set("to", state.customTo);
  }
  return params;
}

export interface FinanceOrderFilterState {
  search: string;
  orderStatus: "" | OrderFulfillmentStatus;
  paymentStatus: "" | PaymentStatus;
  paymentMethod: "" | PaymentGateway;
}

export const EMPTY_FINANCE_ORDER_FILTER_STATE: FinanceOrderFilterState = {
  search: "",
  orderStatus: "",
  paymentStatus: "",
  paymentMethod: "",
};

export function parseFinanceOrderFilterState(
  sp: Record<string, string | string[] | undefined>,
): FinanceOrderFilterState {
  const get = (key: string): string => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const orderStatusRaw = get("orderStatus");
  const paymentStatusRaw = get("paymentStatus");
  const paymentMethodRaw = get("paymentMethod");

  return {
    search: get("search"),
    orderStatus: (ORDER_STATUSES as string[]).includes(orderStatusRaw)
      ? (orderStatusRaw as OrderFulfillmentStatus)
      : "",
    paymentStatus: (PAYMENT_STATUSES as string[]).includes(paymentStatusRaw)
      ? (paymentStatusRaw as PaymentStatus)
      : "",
    paymentMethod: (PAYMENT_METHODS as string[]).includes(paymentMethodRaw)
      ? (paymentMethodRaw as PaymentGateway)
      : "",
  };
}

// Combined params: range state + order filter state, so the Orders page's
// filter controls can change one field without losing the shared date range
// (and vice versa) -- both live in the same URL together.
export function financeOrderFilterStateToParams(
  range: FinanceRangeState,
  filters: FinanceOrderFilterState,
): URLSearchParams {
  const params = financeRangeStateToParams(range);
  if (filters.search) params.set("search", filters.search);
  if (filters.orderStatus) params.set("orderStatus", filters.orderStatus);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  return params;
}

export function countActiveFinanceOrderFilters(state: FinanceOrderFilterState): number {
  return (
    (state.search ? 1 : 0) +
    (state.orderStatus ? 1 : 0) +
    (state.paymentStatus ? 1 : 0) +
    (state.paymentMethod ? 1 : 0)
  );
}
