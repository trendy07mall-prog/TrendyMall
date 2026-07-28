"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmOrder,
  markOrderPaid,
  advanceOrderStatus,
  cancelOrder,
  refundOrder,
} from "@/lib/admin/orderActions";
import { getNextOrderStatus, ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import { useToast } from "@/components/admin/ToastProvider";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { OrderFulfillmentStatus, PaymentGateway, PaymentStatus } from "@/types";

type Action = "cancel" | "refund" | null;

export function OrderActionPanel({
  orderId,
  orderStatus,
  paymentStatus,
  paymentMethod,
}: {
  orderId: string;
  orderStatus: OrderFulfillmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentGateway;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<Action>(null);
  const { showToast } = useToast();
  const router = useRouter();

  function run(action: () => Promise<{ success: true } | { error: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      setConfirmAction(null);
      if ("error" in result) showToast(result.error, "error");
      else {
        showToast(successMessage);
        router.refresh();
      }
    });
  }

  const canCancel = !["cancelled", "returned", "delivered"].includes(orderStatus);
  const canRefund = paymentStatus === "paid";
  const nextStatus = getNextOrderStatus(orderStatus);
  const buttonClass =
    "transition-brand rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50";
  const primaryButtonClass =
    "transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {orderStatus === "pending" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => confirmOrder(orderId), "Order confirmed")}
            className={primaryButtonClass}
          >
            Confirm Order
          </button>
        )}
        {paymentMethod === "cod" && paymentStatus !== "paid" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => markOrderPaid(orderId), "Marked as paid")}
            className={buttonClass}
          >
            Mark Paid
          </button>
        )}
        {nextStatus && orderStatus !== "pending" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => advanceOrderStatus(orderId), `Marked as ${ORDER_STATUS_LABELS[nextStatus]}`)}
            className={primaryButtonClass}
          >
            Mark as {ORDER_STATUS_LABELS[nextStatus]}
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmAction("cancel")}
            className={`${buttonClass} border-[var(--color-discount)] text-[var(--color-discount)]`}
          >
            Cancel Order
          </button>
        )}
        {canRefund && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmAction("refund")}
            className={`${buttonClass} border-[var(--color-discount)] text-[var(--color-discount)]`}
          >
            Refund
          </button>
        )}
      </div>

      {confirmAction === "cancel" && (
        <ConfirmDialog
          title="Cancel Order?"
          message="Stock for every item will be restored and the customer will be emailed. This cannot be undone from here."
          confirmLabel="Cancel Order"
          destructive
          pending={pending}
          onConfirm={() => run(() => cancelOrder(orderId), "Order cancelled")}
          onClose={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "refund" && (
        <ConfirmDialog
          title="Refund Order?"
          message="Stock for every item will be restored, payment marked refunded, and the customer will be emailed."
          confirmLabel="Refund"
          destructive
          pending={pending}
          onConfirm={() => run(() => refundOrder(orderId), "Order refunded")}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
