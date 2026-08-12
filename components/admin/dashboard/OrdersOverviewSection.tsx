import Link from "next/link";
import { OrderSummaryCards } from "@/components/admin/OrderSummaryCards";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import type { AdminOrderTab } from "@/lib/admin/orderStatusFlow";
import type { RecentOrderRow } from "@/lib/admin/dashboard-query";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  awaiting_verification: "Awaiting Verification",
  refunded: "Refunded",
  failed: "Failed",
};

export function OrdersOverviewSection({
  statusCounts,
  recentOrders,
}: {
  statusCounts: Record<AdminOrderTab, number>;
  recentOrders: RecentOrderRow[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Reused exactly as-is from /admin/orders -- same counts, same tab
          taxonomy, same clickable-card shell. Not a new breakdown.
          min-w-0 wrapper: OrderSummaryCards relies on its own
          overflow-x-auto to contain the mobile horizontal scroll, which
          only works if every ancestor flex/grid item up the chain allows
          shrinking below its content's natural width (flex/grid items
          default to min-width:auto, not 0) -- this page's flex-col
          section wrappers need it explicitly, unlike /admin/orders' plain
          block-level layout where it was never an issue. */}
      <div className="min-w-0">
        <OrderSummaryCards counts={statusCounts} />
      </div>

      <div className="min-w-0 rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h3 className="text-sm font-semibold">Recent Orders</h3>
          <Link href="/admin/orders" className="text-xs font-medium text-[#0F2D52] hover:underline">
            View All →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-text-secondary)]">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-secondary)]">
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Payment</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-[#0F2D52] hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{order.itemCount}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium">
                        {ORDER_STATUS_LABELS[order.orderStatus as keyof typeof ORDER_STATUS_LABELS] ?? order.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
