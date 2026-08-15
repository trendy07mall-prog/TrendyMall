// Pure, no-Supabase-dependency shared shapes/constants for Finance --
// deliberately split out of lib/admin/finance-query.ts so client components
// (FinanceDateRangePicker, SalesOverviewChart, etc.) can import range
// types/labels and data shapes WITHOUT pulling in finance-query.ts's
// `createClient` (lib/supabase/server.ts), which depends on next/headers
// and breaks the moment any client bundle reaches it transitively -- this
// is exactly the bug this split fixes (a value import of FINANCE_RANGE_LABELS
// from finance-query.ts inside a "use client" file crashed every /admin/finance
// route with "You're importing a module that depends on next/headers").

import type { OrderFulfillmentStatus, PaymentGateway, PaymentStatus } from "@/types";

const SRI_LANKA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Same Sri-Lanka-calendar-day math as lib/admin/dashboard-query.ts's
// identically-named functions -- duplicated (not imported) specifically to
// keep this file free of any transitive next/headers dependency; that file
// itself imports lib/supabase/server.ts for unrelated reasons and can't be
// safely imported from a client-reachable module.
function sriLankaDateKey(date: Date): string {
  return new Date(date.getTime() + SRI_LANKA_OFFSET_MS).toISOString().slice(0, 10);
}

function startOfSriLankaDay(date: Date): Date {
  const key = sriLankaDateKey(date);
  return new Date(new Date(`${key}T00:00:00Z`).getTime() - SRI_LANKA_OFFSET_MS);
}

function startOfSriLankaMonth(date: Date): Date {
  const key = sriLankaDateKey(date);
  return new Date(new Date(`${key.slice(0, 7)}-01T00:00:00Z`).getTime() - SRI_LANKA_OFFSET_MS);
}

export type FinanceRange =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export const FINANCE_RANGE_LABELS: Record<FinanceRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  custom: "Custom",
};

export interface FinanceRangeWindow {
  from: Date;
  to: Date;
}

export function resolveFinanceRangeWindow(
  range: FinanceRange,
  customFrom?: string,
  customTo?: string,
): FinanceRangeWindow {
  const now = new Date();
  const todayStart = startOfSriLankaDay(now);

  switch (range) {
    case "today":
      return { from: todayStart, to: now };
    case "yesterday": {
      const from = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const to = new Date(todayStart.getTime() - 1);
      return { from, to };
    }
    case "7d":
      return { from: new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000), to: now };
    case "30d":
      return { from: new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000), to: now };
    case "this_month":
      return { from: startOfSriLankaMonth(now), to: now };
    case "last_month": {
      const thisMonthStart = startOfSriLankaMonth(now);
      const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
      const lastMonthStart = startOfSriLankaMonth(lastMonthEnd);
      return { from: lastMonthStart, to: lastMonthEnd };
    }
    case "this_year": {
      const key = sriLankaDateKey(now);
      const yearStart = new Date(new Date(`${key.slice(0, 4)}-01-01T00:00:00Z`).getTime() - SRI_LANKA_OFFSET_MS);
      return { from: yearStart, to: now };
    }
    case "custom": {
      if (!customFrom) return { from: todayStart, to: now };
      const from = new Date(new Date(`${customFrom}T00:00:00Z`).getTime() - SRI_LANKA_OFFSET_MS);
      const to = customTo
        ? new Date(new Date(`${customTo}T23:59:59.999Z`).getTime() - SRI_LANKA_OFFSET_MS)
        : now;
      return { from, to };
    }
  }
}

export { sriLankaDateKey };

export interface FinanceKpis {
  totalSales: number;
  moneyReceived: number;
  pendingPayments: number;
  ordersCount: number;
}

export interface FinanceSalesPoint {
  label: string;
  date: string;
  total: number;
}

export interface FinanceRevenueBreakdown {
  productSales: number;
  deliveryCharges: number;
  discounts: number;
  refunds: number;
  netRevenue: number;
}

export interface FinancePaymentMethodStat {
  method: PaymentGateway;
  count: number;
  amount: number;
}

export interface FinanceOverview {
  kpis: FinanceKpis;
  salesSeries: FinanceSalesPoint[];
  bucket: "day" | "week" | "month";
  revenueBreakdown: FinanceRevenueBreakdown;
  paymentMethods: FinancePaymentMethodStat[];
}

export interface FinanceOrderRow {
  id: string;
  orderNumber: string;
  itemSummary: string;
  itemCount: number;
  createdAt: string;
  orderStatus: OrderFulfillmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  total: number;
  shippingFee: number;
  discount: number;
  refund: number;
}

export interface FinanceOrdersPage {
  orders: FinanceOrderRow[];
  totalCount: number;
}

export interface ProductPerformanceRow {
  productId: string | null;
  productName: string;
  unitsSold: number;
  sales: number;
}
