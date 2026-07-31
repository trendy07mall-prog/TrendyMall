import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { PendingPaymentPoller } from "@/components/order/PendingPaymentPoller";
import { getPaymentDisplay } from "@/lib/order-display";
import type { GuestOrderDetail } from "@/types";

// Shared by /order-confirmation/[orderNumber] and /track-order so they
// can never show a different payment badge, order-status badge, or
// timeline for the same order — the bug this replaces (the page badge
// saying "Pending" while the stepper showed "Confirmed" reached) was
// only possible because this used to be two independently hand-written
// blocks of JSX with their own status logic.
export function OrderStatusSection({ order }: { order: GuestOrderDetail }) {
  const payment = getPaymentDisplay({
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total,
  });

  return (
    <div className="flex flex-col gap-6">
      {order.paymentMethod === "payhere" && order.paymentStatus === "pending" && <PendingPaymentPoller />}
      <div className="flex flex-col items-center gap-2 lg:items-start">
        <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
          <span
            className="border border-current px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide"
            title={payment.message}
          >
            {payment.badge}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            Order status:
            <OrderStatusBadge status={order.orderStatus} />
          </span>
        </div>
        <p className="text-center text-sm text-[var(--muted)] lg:text-left">{payment.message}</p>
      </div>

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
