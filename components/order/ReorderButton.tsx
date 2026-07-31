"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/ToastProvider";
import { getReorderItems } from "@/lib/orders/reorder";

// No batch-add API exists on CartContext (addItem takes one item at a
// time) — this loops it, same as any other multi-add caller would have
// to. No precedent existed for "buy again" anywhere in this codebase
// before this.
export function ReorderButton({ orderId, className }: { orderId: string; className?: string }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleReorder() {
    startTransition(async () => {
      const result = await getReorderItems(orderId);
      if ("error" in result) {
        showToast(result.error, { variant: "error" });
        return;
      }
      if (result.items.length === 0) {
        showToast("None of these items are available anymore", { variant: "error" });
        return;
      }

      result.items.forEach((item) => addItem(item));

      const message =
        result.unavailableCount > 0
          ? `${result.items.length} item${result.items.length === 1 ? "" : "s"} added, ${result.unavailableCount} no longer available`
          : `${result.items.length} item${result.items.length === 1 ? "" : "s"} added to cart`;
      showToast(message, { action: { label: "View Cart", onClick: () => router.push("/cart") } });
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleReorder}
      className={className}
    >
      {pending ? "Adding…" : "Reorder"}
    </button>
  );
}
