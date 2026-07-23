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
    return (
      <span className="flex items-baseline gap-2">
        <span className={`${wasClass} text-[var(--muted)] line-through`}>
          {formatPrice(actualPrice)}
        </span>
        <span className={priceClass}>{formatPrice(specialPrice)}</span>
      </span>
    );
  }

  return <span className={priceClass}>{formatPrice(actualPrice)}</span>;
}
