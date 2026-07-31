import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { getPaymentDisplay } from "@/lib/order-display";
import type { GuestOrderDetail } from "@/types";

// The payment badge + order-status badge + message line — one of the
// components shared verbatim across /order-confirmation, /track-order,
// and /account/orders/[id], so all three can never show a different
// reading of the same order's status (the bug this whole area was built
// to close off: a badge and a stepper independently computing their own
// view of the same status).
export function OrderStatusBadges({ order }: { order: GuestOrderDetail }) {
  const payment = getPaymentDisplay({
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    total: order.total,
  });


  return (
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
  );
}
