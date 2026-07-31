"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMyOrder } from "@/lib/orders/cancel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelMyOrder(orderId);
      setOpen(false);
      if ("error" in result) {
        showToast(result.error, { variant: "error" });
        return;
      }
      showToast("Order cancelled");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="transition-brand inline-flex min-h-11 items-center rounded-full border border-[var(--color-discount)] px-5 text-sm font-medium text-[var(--color-discount)] hover:bg-[var(--color-discount)]/5"
      >
        Cancel Order
      </button>
      {open && (
        <ConfirmDialog
          title="Cancel this order?"
          message="Stock for every item will be restored. This can't be undone."
          confirmLabel="Cancel Order"
          destructive
          pending={pending}
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
