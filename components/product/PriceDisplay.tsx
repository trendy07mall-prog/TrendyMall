import { formatPrice, getDiscountPercent } from "@/lib/utils";

export function PriceDisplay({
  actualPrice,
  specialPrice,
  size = "md",
  showDiscountBadge = true,
}: {
  actualPrice: number;
  specialPrice: number | null;
  size?: "sm" | "md" | "lg";
  showDiscountBadge?: boolean;
}) {
  // "sm" (card grid) needs a smaller font to fit two 4-digit prices + a
  // stock label on one line at /shop's narrowest real column width
  // (lg:grid-cols-4 + filter sidebar, ~187px). The strikethrough price
  // used to also drop its "Rs" prefix here to buy extra width, but the
  // site-wide no-decimals rule already shortens every price string by
  // ~3 characters ("Rs 1,999.00" -> "Rs 1,999"), which recovers that
  // width -- both prices keep "Rs" now, consistent with every other size.
  // "lg" (the /shop redesign's bigger card) intentionally does NOT try to
  // fit on one line with a stock pill the way "sm" does -- ProductCard
  // stacks price and stock vertically for this size instead, so there's no
  // narrow-column constraint here to fit within. The strikethrough+sale
  // price pair, though, still needs its own handling: at 34px, even a
  // single 4-digit price is close to a /shop grid card's full content
  // width -- putting the strikethrough on the SAME row (as "sm"/"md" do)
  // measurably overflowed real prices in testing, so "lg" stacks the
  // strikethrough above the sale price instead of beside it.
  // The price itself is also responsive for "lg": 1024-1279px is a real
  // pinch zone (the filter sidebar AND 4-column grid both activate exactly
  // at lg's 1024px breakpoint, while the page's own --container-width caps
  // at 1280px, so viewport width beyond that buys no extra room) --
  // measured directly, a fixed 34px genuinely clips real 4-digit prices in
  // that range. Full 34px only from xl (1280px) up, where the container
  // has already hit its max and each card has comfortable width.
  const priceClass =
    size === "lg"
      ? "text-[22px] xl:text-[34px] font-bold"
      : size === "md"
        ? "text-xl font-semibold"
        : "text-[13px] font-bold";
  const wasClass = size === "lg" ? "text-sm" : size === "md" ? "text-base" : "text-[11px]";
  const wasText = formatPrice(actualPrice);

  if (specialPrice != null) {
    const discountPercent = getDiscountPercent(actualPrice, specialPrice);
    const badge = showDiscountBadge && discountPercent != null && (
      <span className="rounded-full bg-[var(--color-discount)] px-2 py-0.5 text-[10px] font-semibold text-white">
        -{discountPercent}%
      </span>
    );

    if (size === "lg") {
      return (
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5">
            <span className={`${wasClass} text-[var(--muted)] line-through`}>{wasText}</span>
            {badge}
          </span>
          <span className={priceClass}>{formatPrice(specialPrice)}</span>
        </span>
      );
    }

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
