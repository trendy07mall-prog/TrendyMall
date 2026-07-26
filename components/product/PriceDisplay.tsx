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
  const priceClass = size === "md" ? "text-xl font-semibold" : "text-sm font-semibold";
  const wasClass = size === "md" ? "text-base" : "text-xs";

  if (specialPrice != null) {
    const discountPercent = getDiscountPercent(actualPrice, specialPrice);
    return (
      <span className="flex flex-wrap items-baseline gap-2">
        <span className={`${wasClass} text-[var(--muted)] line-through`}>
          {formatPrice(actualPrice)}
        </span>
        <span className={priceClass}>{formatPrice(specialPrice)}</span>
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
