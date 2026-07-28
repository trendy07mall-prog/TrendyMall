"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DotsIcon } from "@/components/ui/Icon";
import { confirmOrder, markOrderPaid, cancelOrder } from "@/lib/admin/orderActions";
import { useToast } from "@/components/admin/ToastProvider";
import type { AdminOrderRow } from "@/lib/admin/orders-query";

// Compact, one-click actions only — mirrors the outside-click/Escape
// pattern already proven for ProductActionsMenu.tsx's mobile dropdown.
// Actions needing more input (Verify Payment, Add Tracking, the
// packing→delivered progression, Refund) stay on the order detail page.
export function OrderActionsMenu({ order }: { order: AdminOrderRow }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function run(action: () => Promise<{ success: true } | { error: string }>, successMessage: string) {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) showToast(result.error, "error");
      else {
        showToast(successMessage);
        router.refresh();
      }
    });
  }

  const itemClass = "block w-full px-3 py-2 text-left text-sm hover:bg-black/5 disabled:opacity-50";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        disabled={pending}
        className="transition-brand flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
      >
        <DotsIcon className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div className="absolute top-full right-0 z-10 mt-1 min-w-40 rounded-[var(--radius-md)] border border-[var(--border)] bg-white py-1 shadow-[var(--shadow-card-hover)]">
          <Link
            href={`/admin/orders/${order.id}`}
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 text-sm hover:bg-black/5"
          >
            View
          </Link>
          {order.order_status === "pending" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => confirmOrder(order.id), "Order confirmed")}
              className={itemClass}
            >
              Confirm
            </button>
          )}
          {order.payment_method === "cod" && order.payment_status !== "paid" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => markOrderPaid(order.id), "Marked as paid")}
              className={itemClass}
            >
              Mark Paid
            </button>
          )}
          {order.order_status !== "cancelled" &&
            order.order_status !== "returned" &&
            order.order_status !== "delivered" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => cancelOrder(order.id), "Order cancelled")}
                className={`${itemClass} text-[var(--color-discount)]`}
              >
                Cancel
              </button>
            )}
        </div>
      )}
    </div>
  );
}
