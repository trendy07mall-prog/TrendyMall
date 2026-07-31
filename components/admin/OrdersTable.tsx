import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/order/PaymentStatusBadge";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderActionsMenu } from "@/components/admin/OrderActionsMenu";
import { Pagination } from "@/components/product/Pagination";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import type { AdminOrderRow } from "@/lib/admin/orders-query";

export function OrdersTable({
  orders,
  totalCount,
  page,
  pageSize,
  basePath,
  searchParams,
}: {
  orders: AdminOrderRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div>
      <p className="text-sm text-[var(--muted)]">
        Showing {rangeStart}–{rangeEnd} of {totalCount} order{totalCount === 1 ? "" : "s"}
      </p>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Payment Method</th>
              <th className="py-2 pr-4">Payment</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4 align-top">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                    {order.order_number}
                  </Link>
                </td>
                <td className="py-2 pr-4 align-top">{order.customer_name}</td>
                <td className="py-2 pr-4 align-top">{order.customer_phone}</td>
                <td className="py-2 pr-4 align-top">{order.itemCount}</td>
                <td className="py-2 pr-4 align-top">{formatPrice(order.total)}</td>
                <td className="py-2 pr-4 align-top">
                  {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
                </td>
                <td className="py-2 pr-4 align-top">
                  <PaymentStatusBadge status={order.payment_status} />
                </td>
                <td className="py-2 pr-4 align-top">
                  <OrderStatusBadge status={order.order_status} />
                </td>
                <td className="py-2 pr-4 align-top text-[var(--muted)]">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="py-2 align-top">
                  <OrderActionsMenu order={order} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-[var(--muted)]">
                  No orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-4 flex flex-col gap-3 lg:hidden">
        {orders.map((order) => (
          <div key={order.id} className="rounded-[var(--radius-card)] border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                  {order.order_number}
                </Link>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {order.customer_name} · {order.customer_phone}
                </p>
              </div>
              <OrderActionsMenu order={order} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PaymentStatusBadge status={order.payment_status} />
              <OrderStatusBadge status={order.order_status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">
                {order.itemCount} item{order.itemCount === 1 ? "" : "s"} ·{" "}
                {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
              </span>
              <span className="font-medium">{formatPrice(order.total)}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            No orders match the current filters.
          </p>
        )}
      </div>

      <div className="mt-6">
        <Pagination
          basePath={basePath}
          currentPage={page}
          totalPages={totalPages}
          searchParams={searchParams}
        />
      </div>
    </div>
  );
}
