import type { OrderStatus } from "@/types";

const LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="border border-current px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide">
      {LABELS[status]}
    </span>
  );
}
