"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPrice } from "@/lib/utils";
import { CartStockBadge } from "@/components/cart/CartStockBadge";
import { TrashIcon } from "@/components/ui/Icon";
import type { CartItem } from "@/types";
import type { CartItemValidation } from "@/lib/cart-validation";

export function CartItemCard({
  item,
  validation,
}: {
  item: CartItem;
  validation?: CartItemValidation;
}) {
  const { updateQuantity, removeItem, addItem } = useCart();
  const { showToast } = useToast();

  // validation is undefined only for the brief window before the batched
  // re-check resolves — treat as unconstrained rather than blocking the
  // stepper on a false negative.
  const available = validation?.available ?? true;
  const stock = validation?.currentStock ?? null;
  const atMax = stock !== null && item.quantity >= stock;

  function handleRemove() {
    removeItem(item.productId);
    showToast(`${item.name} removed`, {
      action: { label: "Undo", onClick: () => addItem(item) },
    });
  }

  function handleDecrease() {
    if (item.quantity <= 1) return;
    updateQuantity(item.productId, item.quantity - 1);
  }

  function handleIncrease() {
    if (atMax) return;
    updateQuantity(item.productId, item.quantity + 1);
  }

  return (
    <div
      className={`flex gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] transition-brand hover:shadow-[var(--shadow-card-hover)] ${
        !available ? "opacity-60" : ""
      }`}
    >
      <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-black/5">
        {item.image && (
          <Image src={item.image} alt={item.name} fill sizes="100px" className="object-cover" />
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/product/${item.slug}`} className="font-medium hover:underline">
              {item.name}
            </Link>
            <div className="mt-1">
              {!available ? (
                <span className="text-xs font-medium text-[var(--color-discount)]">
                  No longer available
                </span>
              ) : (
                stock !== null && <CartStockBadge stock={stock} />
              )}
            </div>
          </div>
          <span className="text-sm whitespace-nowrap text-[var(--muted)]">
            {formatPrice(item.price)} each
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center rounded-full border border-[var(--border)] transition-[border-color,box-shadow] duration-200 ease-in-out focus-within:border-[var(--foreground)] focus-within:ring-4 focus-within:ring-[rgba(0,0,0,0.08)]">
            <button
              type="button"
              aria-label={`Decrease quantity of ${item.name}`}
              onClick={handleDecrease}
              disabled={item.quantity <= 1}
              className="flex h-9 w-9 items-center justify-center text-lg outline-none disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center text-sm" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Increase quantity of ${item.name}`}
              onClick={handleIncrease}
              disabled={atMax || !available}
              className="flex h-9 w-9 items-center justify-center text-lg outline-none disabled:opacity-30"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
            <button
              type="button"
              onClick={handleRemove}
              aria-label={`Remove ${item.name} from cart`}
              className="transition-brand flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--color-discount)]"
            >
              <TrashIcon className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
