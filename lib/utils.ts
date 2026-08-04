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

// variant.price null means "same as the product's effective price" — it's
// an opt-in override, not a required field.
export function getEffectiveVariantPrice(
  product: { actual_price: number; special_price: number | null },
  variant: { price: number | null } | null | undefined,
): number {
  return variant?.price ?? getEffectivePrice(product);
}

// Same identity a cart line has everywhere: a product on its own, or a
// product pinned to one specific variant. Shared by cart-sync.ts,
// cart-validation.ts, and every cart/checkout list that needs a stable
// React key or a lookup key into a Map keyed the same way.
export function cartLineKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? "base"}`;
}

export function isValidSriLankanPhone(phone: string): boolean {
  return /^(?:\+94|0)[1-9][0-9]{8}$/.test(phone.replace(/[\s-]/g, ""));
}

// wa.me links need the number in international format with no leading
// "+" or "0" — e.g. "0771234567" -> "94771234567".
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/[\s-]/g, "").replace(/^\+/, "");
  return digits.startsWith("0") ? `94${digits.slice(1)}` : digits;
}

export function getDiscountPercent(
  actualPrice: number,
  specialPrice: number | null,
): number | null {
  if (specialPrice == null) return null;
  const percent = Math.round((1 - specialPrice / actualPrice) * 100);
  return percent > 0 ? percent : null;
}
