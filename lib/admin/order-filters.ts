// Mirrors lib/admin/product-filters.ts's shape/pattern for the admin
// orders list — same URL-searchParam-driven state, adapted for order
// fields (tab/payment method/payment status/courier/date range) instead of
// the products list's category/brand/stock filters.

import type { PaymentGateway, PaymentStatus } from "@/types";
import { ADMIN_ORDER_TAB_ORDER, type AdminOrderTab } from "@/lib/admin/orderStatusFlow";

const PAYMENT_METHODS: PaymentGateway[] = ["cod", "bank_transfer", "payhere"];
const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending", "awaiting_verification", "paid", "failed", "cancelled", "refunded",
];

export type AdminPaymentMethodFilter = "" | PaymentGateway;
export type AdminPaymentStatusFilter = "" | PaymentStatus;

export interface AdminOrderFilterState {
  tab: AdminOrderTab;
  search: string;
  paymentMethod: AdminPaymentMethodFilter;
  paymentStatus: AdminPaymentStatusFilter;
  courier: string;
  dateFrom: string;
  dateTo: string;
}

export function parseAdminOrderFilterState(
  sp: Record<string, string | string[] | undefined>,
): AdminOrderFilterState {
  const get = (key: string): string => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const tabRaw = get("tab");
  const paymentMethodRaw = get("paymentMethod");
  const paymentStatusRaw = get("paymentStatus");

  return {
    tab: (ADMIN_ORDER_TAB_ORDER as string[]).includes(tabRaw) ? (tabRaw as AdminOrderTab) : "all",
    search: get("search"),
    paymentMethod: (PAYMENT_METHODS as string[]).includes(paymentMethodRaw)
      ? (paymentMethodRaw as AdminPaymentMethodFilter)
      : "",
    paymentStatus: (PAYMENT_STATUSES as string[]).includes(paymentStatusRaw)
      ? (paymentStatusRaw as AdminPaymentStatusFilter)
      : "",
    courier: get("courier"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
  };
}

export function adminOrderFilterStateToParams(state: AdminOrderFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.tab && state.tab !== "all") params.set("tab", state.tab);
  if (state.search) params.set("search", state.search);
  if (state.paymentMethod) params.set("paymentMethod", state.paymentMethod);
  if (state.paymentStatus) params.set("paymentStatus", state.paymentStatus);
  if (state.courier) params.set("courier", state.courier);
  if (state.dateFrom) params.set("dateFrom", state.dateFrom);
  if (state.dateTo) params.set("dateTo", state.dateTo);
  return params;
}

export function countActiveAdminOrderFilters(state: AdminOrderFilterState): number {
  return (
    (state.search ? 1 : 0) +
    (state.paymentMethod ? 1 : 0) +
    (state.paymentStatus ? 1 : 0) +
    (state.courier ? 1 : 0) +
    (state.dateFrom || state.dateTo ? 1 : 0)
  );
}

export const EMPTY_ADMIN_ORDER_FILTER_STATE: AdminOrderFilterState = {
  tab: "all",
  search: "",
  paymentMethod: "",
  paymentStatus: "",
  courier: "",
  dateFrom: "",
  dateTo: "",
};
