import Link from "next/link";
import Image from "next/image";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { formatPrice, getDiscountPercent } from "@/lib/utils";
import type { ProductWithPrimaryImage } from "@/types";

// The product card inside a homepage campaign section (ActiveCampaignSections).
// Compact on purpose: one discount badge, the name, the price and a round
// cart button beside it. No countdown here -- the section already shows
// one. Colours live in globals.css (.campaign-card): a white card on a
// light page, frosted glass in dark mode, with the photo always on its own
// white tile so product shots look the same in both.
export function CampaignProductCard({
  product,
  linkVariantId = null,
}: {
  product: ProductWithPrimaryImage;
  // The campaign-featured variant, so the product page opens on the exact
  // variant whose price this card shows.
  linkVariantId?: string | null;
}) {
  const href = linkVariantId
    ? `/product/${product.slug}?variant=${linkVariantId}`
    : `/product/${product.slug}`;
  const discountPercent = getDiscountPercent(product.actual_price, product.special_price);
  const price = product.special_price ?? product.actual_price;
  const wasPrice = product.special_price != null && product.special_price < product.actual_price ? product.actual_price : null;
  // Never fabricated: null means no reliably tracked sales.
  const sold = product.totalUnitsSold != null && product.totalUnitsSold > 0 ? product.totalUnitsSold : null;
  const outOfStock = product.stock <= 0;

  return (
    <div className="campaign-card group flex h-full flex-col rounded-2xl p-1.5 pb-2.5 sm:p-2 sm:pb-3">
      <div className="campaign-photo relative aspect-square overflow-hidden rounded-xl">
        <Link href={href} className="relative block h-full w-full" tabIndex={-1} aria-hidden="true">
          {product.image ? (
            <Image
              src={product.image}
              alt=""
              fill
              loading="lazy"
              sizes="(max-width: 640px) 42vw, 20vw"
              className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">No image</span>
          )}
        </Link>
        {discountPercent != null && (
          <span className="absolute top-2 left-2 rounded-full bg-[#DC2626] px-2 py-0.5 text-[11px] font-extrabold text-white sm:text-xs">
            -{discountPercent}%
          </span>
        )}
        <div className="absolute top-1.5 right-1.5">
          <WishlistButton
            productId={product.id}
            slug={product.slug}
            name={product.name}
            price={price}
            variantId={product.defaultVariantId || null}
            image={product.image}
            className="campaign-wish transition-brand flex h-9 w-9 items-center justify-center rounded-full"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-1 pt-2.5">
        <h3 className="line-clamp-2 min-h-[2.7em] text-[13px] leading-[1.35] font-semibold sm:text-sm">
          <Link href={href} className="text-[var(--cc-ink)] hover:text-[var(--cc-ink-hover)]">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            {wasPrice != null && (
              <span className="truncate text-[11px] text-[var(--cc-muted)] line-through sm:text-xs">{formatPrice(wasPrice)}</span>
            )}
            <span className="truncate text-base leading-tight font-extrabold text-[var(--cc-price)] sm:text-lg">
              {formatPrice(price)}
            </span>
            <span className="h-4 truncate text-[11px] text-[var(--cc-muted)]">
              {outOfStock ? "Out of stock" : sold != null ? `${sold} sold` : ""}
            </span>
          </div>
          <QuickAddButton product={product} shape="round" />
        </div>
      </div>
    </div>
  );
}
