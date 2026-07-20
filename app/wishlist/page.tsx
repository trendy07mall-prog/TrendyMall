"use client";

import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";

export default function WishlistPage() {
  const { items, remove } = useWishlist();
  const { addItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-4xl">🤍</p>
        <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">
          Your wishlist is empty
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Save products you love and come back to them anytime.
        </p>
        <Link
          href="/shop"
          className="mt-6 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Wishlist
      </h1>
      <ul className="mt-8 flex flex-col gap-4">
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] p-4"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Link
                href={`/product/${item.slug}`}
                className="text-sm font-medium hover:underline"
              >
                {item.name}
              </Link>
              <span className="text-sm text-[var(--muted)]">
                {formatPrice(item.price)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  addItem({
                    productId: item.productId,
                    slug: item.slug,
                    name: item.name,
                    price: item.price,
                    image: item.image,
                    quantity: 1,
                  });
                  remove(item.productId);
                }}
                className="rounded-full bg-[var(--foreground)] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85"
              >
                Move to cart
              </button>
              <button
                type="button"
                onClick={() => remove(item.productId)}
                className="text-xs text-[var(--muted)] underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
