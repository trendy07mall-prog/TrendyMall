// Mirrors lib/admin/product-filters.ts's shape/pattern for the admin
// orders list — same URL-searchParam-driven state, adapted for order
// fields (order_status/payment_method/date range) instead of the
// products list's category/brand/stock filters.

import type { OrderFulfillmentStatus, PaymentGateway } from "@/types";

const ORDER_STATUSES: OrderFulfillmentStatus[] = [
  "pending", "confirmed", "packing", "shipped", "out_for_delivery",
  "delivered", "cancelled", "returned", "failed_delivery",
];
const PAYMENT_METHODS: PaymentGateway[] = ["cod", "bank_transfer", "payhere"];

export type AdminOrderStatusFilter = "" | OrderFulfillmentStatus;
export type AdminPaymentMethodFilter = "" | PaymentGateway;

export interface AdminOrderFilterState {
  search: string;
  orderStatus: AdminOrderStatusFilter;
  paymentMethod: AdminPaymentMethodFilter;
  dateFrom: string;
  dateTo: string;
}

export function parseAdminOrderFilterState(
  sp: Record<string, string | string[] | undefined>,
): AdminOrderFilterState {
  const get = (key: string): string => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const orderStatusRaw = get("orderStatus");
  const paymentMethodRaw = get("paymentMethod");

  return {
    search: get("search"),
    orderStatus: (ORDER_STATUSES as string[]).includes(orderStatusRaw)
      ? (orderStatusRaw as AdminOrderStatusFilter)
      : "",
    paymentMethod: (PAYMENT_METHODS as string[]).includes(paymentMethodRaw)
      ? (paymentMethodRaw as AdminPaymentMethodFilter)
      : "",
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
  };
}

export function adminOrderFilterStateToParams(state: AdminOrderFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.orderStatus) params.set("orderStatus", state.orderStatus);
  if (state.paymentMethod) params.set("paymentMethod", state.paymentMethod);
  if (state.dateFrom) params.set("dateFrom", state.dateFrom);
  if (state.dateTo) params.set("dateTo", state.dateTo);
  return params;
}

export function countActiveAdminOrderFilters(state: AdminOrderFilterState): number {
  return (
    (state.search ? 1 : 0) +
    (state.orderStatus ? 1 : 0) +
    (state.paymentMethod ? 1 : 0) +
    (state.dateFrom || state.dateTo ? 1 : 0)
  );
}

export const EMPTY_ADMIN_ORDER_FILTER_STATE: AdminOrderFilterState = {
  search: "",
  orderStatus: "",
  paymentMethod: "",
  dateFrom: "",
  dateTo: "",
};
