"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/order/PaymentStatusBadge";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderActionsMenu } from "@/components/admin/OrderActionsMenu";
import { OrderBulkActionBar } from "@/components/admin/OrderBulkActionBar";
import { MarkDeliveredButton } from "@/components/admin/MarkDeliveredButton";
import { ShippingInfoForm } from "@/components/admin/ShippingInfoForm";
import { MarkFailedDeliveryForm } from "@/components/admin/MarkFailedDeliveryForm";
import { confirmOrder, cancelOrder, advanceOrderStatus, reattemptDelivery, markOrderReturned } from "@/lib/admin/orderActions";
import { useToast } from "@/components/admin/ToastProvider";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/product/Pagination";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import { DownloadIcon, PrinterIcon } from "@/components/ui/Icon";
import { ActionButton, actionButtonClasses } from "@/components/ui/ActionButton";
import type { AdminOrderItemRow, AdminOrderRow } from "@/lib/admin/orders-query";
import type { AdminOrderTab } from "@/lib/admin/orderStatusFlow";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function QuickActionButton({
  action,
  successMessage,
  children,
  destructive,
}: {
  action: () => Promise<{ success: true } | { error: string }>;
  successMessage: string;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if ("error" in result) showToast(result.error, "error");
          else {
            showToast(successMessage);
            router.refresh();
          }
        })
      }
      className={`transition-brand rounded-full border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        destructive
          ? "border-[var(--color-discount)] text-[var(--color-discount)] hover:bg-[var(--color-discount)]/5"
          : "border-[var(--border)] hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

// Tab-aware: renders different extra columns/quick actions per workflow
// stage (New/Packaging/Ready to Ship/Out for Delivery/Delivered/Cancelled)
// rather than seven duplicated table shells — the checkbox/selection/
// pagination shell is shared, only the cell content branches on `tab`.
export function OrdersTable({
  orders,
  totalCount,
  page,
  pageSize,
  basePath,
  searchParams,
  tab,
}: {
  orders: AdminOrderRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  tab: AdminOrderTab;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);
  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          Showing {rangeStart}–{rangeEnd} of {totalCount} order{totalCount === 1 ? "" : "s"}
        </p>
        {orders.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
            Select all on this page
          </label>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            tab={tab}
            selected={selectedIds.has(order.id)}
            onToggle={() => toggleOne(order.id)}
          />
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

      {selectedIds.size > 0 && (
        <OrderBulkActionBar
          selectedIds={[...selectedIds]}
          tab={tab}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

function OrderRow({
  order,
  tab,
  selected,
  onToggle,
}: {
  order: AdminOrderRow;
  tab: AdminOrderTab;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = order.items.length - 1;
  const visibleItems = order.items.length <= 1 || expanded ? order.items : order.items.slice(0, 1);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${order.order_number}`}
            className="mt-1"
          />
          <div>
            <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
              {order.order_number}
            </Link>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {order.customer_name} · {order.customer_phone}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {order.itemCount} item{order.itemCount === 1 ? "" : "s"} ·{" "}
              {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method} ·{" "}
              {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatPrice(order.total)}</span>
          <OrderStatusBadge status={order.order_status} />
          <OrderActionsMenu order={order} />
        </div>
      </div>

      {order.items.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
          {visibleItems.map((item) => (
            <OrderItemLine key={item.id} item={item} />
          ))}
          {hiddenCount > 0 && (
            <ActionButton
              label={expanded ? "Show less" : `+${hiddenCount} more item${hiddenCount === 1 ? "" : "s"}`}
              onClick={() => setExpanded((v) => !v)}
              className="self-start"
            />
          )}
        </div>
      )}

      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <TabBody order={order} tab={tab} />
      </div>
    </div>
  );
}

// Pulled entirely from the order_items snapshot (name/image/price/variant
// color+attributes as they were at purchase time) — never a live join to
// the current product, since it may have since changed price or been
// discontinued. SKU is the one exception (see AdminOrderItemRow's comment
// in orders-query.ts): order_items has no sku column, so it's resolved via
// a live products/product_variants lookup, which is safe in practice since
// a SKU essentially never changes after a product is created.
function OrderItemLine({ item }: { item: AdminOrderItemRow }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-black/5">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" fill sizes="44px" className="object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.productName}</p>
        {(item.variantName || item.variantColorHex || (item.attributeSelections?.length ?? 0) > 0) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
            {item.variantColorHex && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--border)]"
                style={{ backgroundColor: item.variantColorHex }}
                aria-hidden="true"
              />
            )}
            {item.variantName && <span>{item.variantName}</span>}
            {item.attributeSelections?.map((sel) => (
              <span key={sel.attributeName}>
                {sel.attributeName}: {sel.value}
              </span>
            ))}
          </div>
        )}
        <p
          className="mt-0.5 truncate font-mono text-[11px] text-[var(--muted)]"
          title={`ID: ${item.productId ?? "—"}${item.sku ? ` · SKU: ${item.sku}` : ""}`}
        >
          ID: {item.productId ?? "—"}
          {item.sku && <> · SKU: {item.sku}</>}
        </p>
      </div>
      <div className="shrink-0 text-right text-sm whitespace-nowrap">
        <p>
          {item.quantity} × {formatPrice(item.unitPrice)}
        </p>
        <p className="text-[var(--muted)]">{formatPrice(item.subtotal)}</p>
      </div>
    </div>
  );
}

function TabBody({ order, tab }: { order: AdminOrderRow; tab: AdminOrderTab }) {
  switch (tab) {
    case "new":
      return (
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={order.payment_status} />
          <div className="ml-auto flex gap-2">
            <QuickActionButton action={() => confirmOrder(order.id)} successMessage="Order confirmed">
              Confirm
            </QuickActionButton>
            <QuickActionButton
              action={() => cancelOrder(order.id)}
              successMessage="Order cancelled"
              destructive
            >
              Cancel
            </QuickActionButton>
          </div>
        </div>
      );

    case "packaging": {
      const isPacked = order.order_status === "packing";
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--muted)]">
            Packing status: <span className="font-medium text-[var(--foreground)]">{isPacked ? "Packed" : "Not Packed"}</span>
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            {/* Plain <a>, not ActionLinkButton/next-Link -- these point at
                route.ts file-streaming endpoints (PDF generation), not
                pages, so Next's prefetch/soft-navigation doesn't apply;
                actionButtonClasses gives them the identical visual
                treatment without going through <Link>. */}
            <a
              href={`/invoices/${order.id}?disposition=inline`}
              target="_blank"
              rel="noopener noreferrer"
              className={actionButtonClasses("neutral", "xs", false)}
            >
              <PrinterIcon className="h-3.5 w-3.5" />
              <span>Print Invoice</span>
            </a>
            <a href={`/invoices/${order.id}`} className={actionButtonClasses("neutral", "xs", false)}>
              <DownloadIcon className="h-3.5 w-3.5" />
              <span>Download Invoice</span>
            </a>
            <a
              href={`/shipping-labels/${order.id}?disposition=inline`}
              target="_blank"
              rel="noopener noreferrer"
              className={actionButtonClasses("neutral", "xs", false)}
            >
              <PrinterIcon className="h-3.5 w-3.5" />
              <span>Print Shipping Label</span>
            </a>
            <a href={`/shipping-labels/${order.id}`} className={actionButtonClasses("neutral", "xs", false)}>
              <DownloadIcon className="h-3.5 w-3.5" />
              <span>Download Shipping Label</span>
            </a>
            {!isPacked && (
              <QuickActionButton action={() => advanceOrderStatus(order.id)} successMessage="Marked as packed">
                Mark Packed
              </QuickActionButton>
            )}
          </div>
        </div>
      );
    }

    case "ready_to_ship":
      return (
        <ShippingInfoForm
          orderId={order.id}
          courier={order.courier}
          trackingNumber={order.tracking_number}
          trackingUrl={order.tracking_url}
        />
      );

    case "out_for_delivery":
      if (order.order_status === "failed_delivery") {
        return (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-error)]">
              Delivery failed — {order.delivery_failure_reason ?? "no reason recorded"}
            </p>
            <div className="flex gap-2">
              <QuickActionButton action={() => reattemptDelivery(order.id)} successMessage="Marked as out for delivery">
                Reattempt Delivery
              </QuickActionButton>
              <QuickActionButton
                action={() => markOrderReturned(order.id)}
                successMessage="Order marked returned"
                destructive
              >
                Mark Returned
              </QuickActionButton>
            </div>
          </div>
        );
      }
      return (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-[var(--muted)]">
            Courier: <span className="text-[var(--foreground)]">{order.courier ?? "—"}</span>
          </span>
          <span className="text-sm text-[var(--muted)]">
            Tracking: <span className="text-[var(--foreground)]">{order.tracking_number ?? "—"}</span>
          </span>
          <span className="text-sm text-[var(--muted)]">
            Dispatched: <span className="text-[var(--foreground)]">{order.dispatchedAt ? formatDateTime(order.dispatchedAt) : "—"}</span>
          </span>
          {order.order_status === "shipped" ? (
            <div className="ml-auto">
              <QuickActionButton action={() => advanceOrderStatus(order.id)} successMessage="Marked as out for delivery">
                Mark Out for Delivery
              </QuickActionButton>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <MarkDeliveredButton
                orderId={order.id}
                paymentMethod={order.payment_method as "cod" | "bank_transfer" | "payhere"}
                paymentStatus={order.payment_status}
              />
            </div>
          )}
          {order.order_status === "out_for_delivery" && (
            <div className="w-full">
              <MarkFailedDeliveryForm orderId={order.id} />
            </div>
          )}
        </div>
      );

    case "delivered":
      return (
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
          <span>
            Delivered: <span className="text-[var(--foreground)]">{order.deliveredAt ? formatDateTime(order.deliveredAt) : "—"}</span>
          </span>
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      );

    case "cancelled":
      return (
        <div className="flex flex-col gap-1 text-sm text-[var(--muted)]">
          <span>
            Reason: <span className="text-[var(--foreground)]">{order.cancelReason ?? "Not recorded"}</span>
          </span>
          <span>
            Cancelled by: <span className="text-[var(--foreground)]">{order.cancelledByName ?? "—"}</span>
          </span>
          <span>Refund status: —</span>
        </div>
      );

    default:
      return null;
  }
}
