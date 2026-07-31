import { OrderStatusBadges } from "@/components/order/OrderStatusBadges";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { PendingPaymentPoller } from "@/components/order/PendingPaymentPoller";
import type { GuestOrderDetail } from "@/types";

// A thin composer of OrderStatusBadges + OrderTimeline for pages that
// want this exact bundled card layout (/order-confirmation, /track-order).
// /account/orders/[id] composes the two pieces directly instead — its
// "status prominently at top" layout doesn't want the same card wrapper.
export function OrderStatusSection({ order }: { order: GuestOrderDetail }) {
  return (
    <div className="flex flex-col gap-6">
      {order.paymentMethod === "payhere" && order.paymentStatus === "pending" && <PendingPaymentPoller />}
      <OrderStatusBadges order={order} />

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
        <h2 className="text-sm font-semibold">Order status</h2>
        <div className="mt-4">
          <OrderTimeline
            status={order.orderStatus}
            failureReason={order.failureReason}
            deliveryAttemptCount={order.deliveryAttemptCount}
            statusHistory={order.statusHistory}
            createdAt={order.createdAt}
            orderNumber={order.orderNumber}
          />
        </div>
      </section>
    </div>
  );
}
