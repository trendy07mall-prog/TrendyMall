import { formatPrice } from "@/lib/utils";

export function PriceDisplay({
  actualPrice,
  specialPrice,
  size = "md",
}: {
  actualPrice: number;
  specialPrice: number | null;
  size?: "sm" | "md";
}) {
  const priceClass = size === "md" ? "text-xl font-semibold" : "text-sm font-semibold";
  const wasClass = size === "md" ? "text-base" : "text-xs";

  if (specialPrice != null) {
    const discountPercent = Math.round((1 - specialPrice / actualPrice) * 100);
    return (
      <span className="flex flex-wrap items-baseline gap-2">
        <span className={`${wasClass} text-[var(--muted)] line-through`}>
          {formatPrice(actualPrice)}
        </span>
        <span className={priceClass}>{formatPrice(specialPrice)}</span>
        {discountPercent > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            -{discountPercent}%
          </span>
        )}
      </span>
    );
  }

  return <span className={priceClass}>{formatPrice(actualPrice)}</span>;
}
