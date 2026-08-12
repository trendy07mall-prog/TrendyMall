import { formatPrice, getDiscountPercent } from "@/lib/utils";

export function PriceDisplay({
  actualPrice,
  specialPrice,
  size = "md",
  showDiscountBadge = true,
}: {
  actualPrice: number;
  specialPrice: number | null;
  // The one shared price size/layout for every product grid (New Arrivals,
  // /shop, category, search, campaign sections) is "sm" -- there is no
  // separate bigger variant for /shop anymore, specifically so its price
  // text can never visually drift from every other grid again. "md" is
  // PDP-only (components/product/ProductPurchaseSection.tsx), a
  // legitimately different, more prominent context.
  size?: "sm" | "md";
  showDiscountBadge?: boolean;
}) {
  // "sm" (every product grid card) needs a smaller font to fit two 4-digit
  // prices + a stock label on one line at /shop's narrowest real column
  // width (lg:grid-cols-4 + filter sidebar, ~187px).
  const priceClass = size === "md" ? "text-xl font-semibold" : "text-[13px] font-bold";
  const wasClass = size === "md" ? "text-base" : "text-[11px]";
  const wasText = formatPrice(actualPrice);

  if (specialPrice != null) {
    const discountPercent = getDiscountPercent(actualPrice, specialPrice);
    const badge = showDiscountBadge && discountPercent != null && (
      <span className="rounded-full bg-[var(--color-discount)] px-2 py-0.5 text-[10px] font-semibold text-white">
        -{discountPercent}%
      </span>
    );

    return (
      <span className="flex flex-nowrap items-baseline gap-0.5">
        <span className={`${wasClass} shrink-0 text-[var(--muted)] line-through`}>{wasText}</span>
        <span className={`${priceClass} shrink-0`}>{formatPrice(specialPrice)}</span>
        {badge}
      </span>
    );
  }

  return <span className={priceClass}>{formatPrice(actualPrice)}</span>;
}
