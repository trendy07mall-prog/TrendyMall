import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { ReorderButton } from "@/components/order/ReorderButton";
import { Pagination } from "@/components/product/Pagination";
import { ORDER_STATUS_PROGRESSION } from "@/lib/admin/orderStatusFlow";
import { ShoppingBagIcon, TruckIcon } from "@/components/ui/Icon";
import type { AccountOrderRow } from "@/lib/account/orders-query";
import type { AccountOrderFilterState } from "@/lib/account/order-filters";
import type { OrderFulfillmentStatus } from "@/types";

const actionLinkClass =
  "transition-brand inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-3 text-xs font-medium hover:bg-black/5";

// A compact 6-dot progress indicator for a list row — too small a space
// for the full OrderTimeline stepper, and this is list-specific, not one
// of the components shared across the confirmation/detail/track-order
// pages. Hidden for statuses with nothing left "in progress" to show.
function MiniProgress({ status }: { status: OrderFulfillmentStatus }) {
  if (status === "delivered" || status === "cancelled" || status === "returned") return null;
  const currentIndex =
    status === "failed_delivery"
      ? ORDER_STATUS_PROGRESSION.indexOf("out_for_delivery")
      : ORDER_STATUS_PROGRESSION.indexOf(status);

  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {ORDER_STATUS_PROGRESSION.map((step, index) => (
        <span
          key={step}
          className={`h-1.5 w-4 rounded-full ${index <= currentIndex ? "bg-[var(--foreground)]" : "bg-[var(--border)]"}`}
        />
      ))}
    </div>
  );
}

function Thumbnails({ order }: { order: AccountOrderRow }) {
  const extra = order.itemCount - order.thumbnails.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {order.thumbnails.map((url, index) => (
          <div
            key={index}
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2 border-[var(--color-card)] bg-black/5"
          >
            <Image src={url} alt="" fill sizes="40px" className="object-cover" />
          </div>
        ))}
      </div>
      {extra > 0 && <span className="ml-2 text-xs text-[var(--muted)]">+{extra}</span>}
    </div>
  );
}

function RowActions({ order }: { order: AccountOrderRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/account/orders/${order.id}`} className={actionLinkClass}>
        <TruckIcon className="mr-1 h-3.5 w-3.5" />
        View Order
      </Link>
      <ReorderButton orderId={order.id} className={actionLinkClass} />
      <a href={`/invoices/${order.id}`} className={actionLinkClass}>
        Invoice
      </a>
    </div>
  );
}

export function OrdersList({
  orders,
  totalCount,
  page,
  pageSize,
  basePath,
  searchParams,
  filters,
}: {
  orders: AccountOrderRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  filters: AccountOrderFilterState;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (orders.length === 0) {
    const hasFilters = Boolean(filters.search || filters.tab !== "all");
    return (
      <div className="mt-8 flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] py-16 text-center">
        <p className="text-sm text-[var(--muted)]">
          {hasFilters ? "No orders match the current filters." : "You haven't placed any orders yet."}
        </p>
        {hasFilters ? (
          <Link href={basePath} className="text-sm underline">
            Clear filters
          </Link>
        ) : (
          <Link
            href="/shop"
            className="transition-brand rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
          >
            <ShoppingBagIcon className="mr-1.5 inline h-4 w-4" />
            Start shopping
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Placed</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-[var(--border)]">
                <td className="py-3 pr-4 align-top">
                  <Link href={`/account/orders/${order.id}`} className="font-medium hover:underline">
                    {order.order_number}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
                  </p>
                </td>
                <td className="py-3 pr-4 align-top">
                  <Thumbnails order={order} />
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </p>
                </td>
                <td className="py-3 pr-4 align-top font-medium">{formatPrice(order.total)}</td>
                <td className="py-3 pr-4 align-top">
                  <OrderStatusBadge status={order.order_status} />
                  <div className="mt-2">
                    <MiniProgress status={order.order_status} />
                  </div>
                </td>
                <td className="py-3 pr-4 align-top text-[var(--muted)]">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 align-top">
                  <RowActions order={order} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 flex flex-col gap-3 lg:hidden">
        {orders.map((order) => (
          <div key={order.id} className="rounded-[var(--radius-card)] border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/account/orders/${order.id}`} className="font-medium hover:underline">
                  {order.order_number}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(order.created_at).toLocaleDateString()} ·{" "}
                  {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}
                </p>
              </div>
              <span className="font-medium">{formatPrice(order.total)}</span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <Thumbnails order={order} />
              <OrderStatusBadge status={order.order_status} />
            </div>
            <div className="mt-2">
              <MiniProgress status={order.order_status} />
            </div>

            <div className="mt-3">
              <RowActions order={order} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Pagination basePath={basePath} currentPage={page} totalPages={totalPages} searchParams={searchParams} />
      </div>
    </div>
  );
}
