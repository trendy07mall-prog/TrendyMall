import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/order/PaymentStatusBadge";
import { Pagination } from "@/components/product/Pagination";
import type { FinanceOrderRow } from "@/lib/admin/finance-shared";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// A real table (not the card-list convention used by the workflow-action
// OrdersTable.tsx on /admin/orders) -- Finance is read-only reporting with
// its own money-column shape, and the cross-cutting rule explicitly allows
// "responsive cards or scrollable tables" -- this is the latter, wrapped in
// its own overflow-x-auto so it never forces the whole page to scroll.
export function FinanceOrdersTable({
  orders,
  totalCount,
  page,
  pageSize,
  basePath,
  searchParams,
}: {
  orders: FinanceOrderRow[];
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

      <div className="mt-3 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)]">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-black/[0.02] text-left text-xs text-[var(--color-text-secondary)]">
              <th className="px-3 py-2.5 font-medium">Order Details</th>
              <th className="px-3 py-2.5 font-medium">Order Date</th>
              <th className="px-3 py-2.5 font-medium">Order Status</th>
              <th className="px-3 py-2.5 text-right font-medium">Order Amount</th>
              <th className="px-3 py-2.5 font-medium">Payment Status</th>
              <th className="px-3 py-2.5 text-right font-medium">Delivery Charge</th>
              <th className="px-3 py-2.5 text-right font-medium">Discount</th>
              <th className="px-3 py-2.5 text-right font-medium">Refund</th>
              <th className="px-3 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-[var(--border)] last:border-0">
                <td className="max-w-[240px] px-3 py-2.5 align-top">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                    {order.orderNumber}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]" title={order.itemSummary}>
                    {order.itemSummary}
                  </p>
                </td>
                <td className="px-3 py-2.5 align-top whitespace-nowrap text-[var(--color-text-secondary)]">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <OrderStatusBadge status={order.orderStatus} />
                </td>
                <td className="px-3 py-2.5 text-right align-top font-medium [font-variant-numeric:tabular-nums]">
                  {formatPrice(order.total)}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <PaymentStatusBadge status={order.paymentStatus} />
                </td>
                <td className="px-3 py-2.5 text-right align-top [font-variant-numeric:tabular-nums]">
                  {formatPrice(order.shippingFee)}
                </td>
                <td className="px-3 py-2.5 text-right align-top text-[var(--color-discount)] [font-variant-numeric:tabular-nums]">
                  {order.discount > 0 ? `-${formatPrice(order.discount)}` : formatPrice(0)}
                </td>
                <td className="px-3 py-2.5 text-right align-top [font-variant-numeric:tabular-nums]">
                  {formatPrice(order.refund)}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium hover:bg-black/5"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-sm text-[var(--muted)]">
                  No orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath={basePath} currentPage={page} totalPages={totalPages} searchParams={searchParams} />
    </div>
  );
}
