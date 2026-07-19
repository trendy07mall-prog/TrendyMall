"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import type { CartItem } from "@/types";

export function CartLineItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <li className="flex gap-4 border-b border-zinc-200 py-4 dark:border-zinc-800">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden border border-black dark:border-white">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between gap-4">
          <Link
            href={`/product/${item.slug}`}
            className="text-sm font-medium hover:underline"
          >
            {item.name}
          </Link>
          <span className="text-sm whitespace-nowrap">
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor={`qty-${item.productId}`}
            className="text-xs text-zinc-500"
          >
            Qty
          </label>
          <input
            id={`qty-${item.productId}`}
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) =>
              updateQuantity(item.productId, Number(e.target.value) || 1)
            }
            className="w-16 border border-black bg-transparent px-2 py-1 text-sm dark:border-white"
          />
          <button
            type="button"
            onClick={() => removeItem(item.productId)}
            className="text-xs text-zinc-500 underline"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
