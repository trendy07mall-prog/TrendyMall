import { formatPrice, getDiscountPercent } from "@/lib/utils";

export function PriceDisplay({
  actualPrice,
  specialPrice,
  size = "md",
  showDiscountBadge = true,
}: {
  actualPrice: number;
  specialPrice: number | null;
  size?: "sm" | "md";
  showDiscountBadge?: boolean;
}) {
  // "sm" (card grid) needs both a smaller font AND the redundant currency
  // prefix dropped from the muted strikethrough price to fit two 4-digit
  // prices + a stock label on one line at /shop's narrowest real column
  // width (lg:grid-cols-4 + filter sidebar, ~187px) -- font size alone
  // was still ~5-10px short there (measured directly). Verified against
  // every real catalog price plus a synthetic 5-digit worst case; a
  // genuine 5-digit price would still overflow that narrowest grid, but
  // nothing in the current catalog goes past 4 digits.
  const priceClass = size === "md" ? "text-xl font-semibold" : "text-[13px] font-bold";
  const wasClass = size === "md" ? "text-base" : "text-[11px]";
  const wasText = formatPrice(actualPrice);

  if (specialPrice != null) {
    const discountPercent = getDiscountPercent(actualPrice, specialPrice);
    return (
      <span className="flex flex-nowrap items-baseline gap-0.5">
        <span className={`${wasClass} shrink-0 text-[var(--muted)] line-through`}>
          {size === "sm" ? wasText.replace(/^[^\d]+/, "") : wasText}
        </span>
        <span className={`${priceClass} shrink-0`}>{formatPrice(specialPrice)}</span>
        {showDiscountBadge && discountPercent != null && (
          <span className="rounded-full bg-[var(--color-discount)] px-2 py-0.5 text-[10px] font-semibold text-white">
            -{discountPercent}%
          </span>
        )}
      </span>
    );
  }

  return <span className={priceClass}>{formatPrice(actualPrice)}</span>;
}
