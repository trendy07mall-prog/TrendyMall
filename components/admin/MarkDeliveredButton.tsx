"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOrderDelivered } from "@/lib/admin/orderActions";
import { useToast } from "@/components/admin/ToastProvider";
import type { PaymentGateway, PaymentStatus } from "@/types";

const buttonClass =
  "transition-brand rounded-full bg-[var(--foreground)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50";

// We've previously had orders showing Delivered + Payment Pending at the
// same time, which is contradictory for Cash on Delivery. For an unpaid
// COD order, this stops and asks staff to confirm cash was actually
// collected before marking delivered, instead of silently assuming it —
// every other case (non-COD, or COD already paid) is still one click.
export function MarkDeliveredButton({
  orderId,
  paymentMethod,
  paymentStatus,
}: {
  orderId: string;
  paymentMethod: PaymentGateway;
  paymentStatus: PaymentStatus;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  const needsCodConfirmation = paymentMethod === "cod" && paymentStatus !== "paid";

  function run(codCollected?: boolean) {
    startTransition(async () => {
      const result = await markOrderDelivered(orderId, { codCollected });
      setConfirmOpen(false);
      if ("error" in result) showToast(result.error, "error");
      else {
        showToast("Marked as delivered");
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => (needsCodConfirmation ? setConfirmOpen(true) : run())}
        className={buttonClass}
      >
        Delivered
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm cash collected"
            className="absolute top-1/2 left-1/2 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card-hover)]"
          >
            <h2 className="text-lg font-bold">Cash collected?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This is a Cash on Delivery order that isn&apos;t marked paid yet. Confirm the cash was
              collected before marking it delivered.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(true)}
                className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
              >
                {pending ? "Working…" : "Yes, cash collected — mark paid & delivered"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(false)}
                className="transition-brand rounded-full border border-[var(--color-discount)] px-4 py-2 text-sm font-medium text-[var(--color-discount)] hover:bg-[var(--color-discount)]/5 disabled:opacity-50"
              >
                {pending ? "Working…" : "No, collection failed"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="transition-brand rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
