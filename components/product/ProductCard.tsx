import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];

  return (
    <Link href={`/product/${product.slug}`} className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden border border-black dark:border-white">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
            No image
          </div>
        )}
      </div>
      <h3 className="mt-3 text-sm font-medium">{product.name}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {formatPrice(product.price)}
      </p>
    </Link>
  );
}
