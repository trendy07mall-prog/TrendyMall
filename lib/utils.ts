const priceFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
});

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

export function slugify(input: string, maxLength = 60): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, maxLength).replace(/-+$/g, "");
}

export function getEffectivePrice(product: {
  actual_price: number;
  special_price: number | null;
}): number {
  return product.special_price ?? product.actual_price;
}

export function getDiscountPercent(
  actualPrice: number,
  specialPrice: number | null,
): number | null {
  if (specialPrice == null) return null;
  const percent = Math.round((1 - specialPrice / actualPrice) * 100);
  return percent > 0 ? percent : null;
}
