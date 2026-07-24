"use client";

import Link from "next/link";
import Image from "next/image";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import { formatPrice } from "@/lib/utils";

export function RecentlyViewedSection({ excludeProductId }: { excludeProductId?: string }) {
  const { items } = useRecentlyViewed();
  const visible = items.filter((item) => item.productId !== excludeProductId);

  if (visible.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-heading text-xl font-bold tracking-tight">
        Recently Viewed
      </h2>
      <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {visible.map((item) => (
          <Link
            key={item.productId}
            href={`/product/${item.slug}`}
            className="w-36 shrink-0 snap-start sm:w-44"
          >
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-black/5">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                  No image
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm">{item.name}</p>
            <p className="mt-0.5 text-sm font-medium">{formatPrice(item.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
