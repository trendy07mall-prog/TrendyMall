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

// Price lives ONLY on the variant now — every product has at least one
// (an invisible "default" variant for products with no real color/size
// choice), so there is no product-level fallback to fall back to anymore.
export function getVariantPrice(variant: {
  regular_price: number;
  sale_price: number | null;
}): number {
  return variant.sale_price ?? variant.regular_price;
}

// The single "which variant represents this product" algorithm, shared by
// every surface that needs to pick one: the shop/category/search card, the
// PDP's initial selection, CSV export, cart recommendations. Must stay
// identical everywhere it's used -- a card showing one variant's price
// while the PDP defaults to a different variant is the exact bug class
// this function exists to prevent. Prefers in-stock variants (a card
// advertising an out-of-stock variant's price is misleading, and the PDP
// can't usefully default to something the customer can't buy); only
// considers out-of-stock rows if every variant is out of stock. Within
// that pool: cheapest on-sale price wins if any variant is on sale, else
// cheapest regular price; ties break on is_default.
export function pickWinningVariant<
  T extends {
    regular_price: number;
    sale_price: number | null;
    stock: number | null;
    is_default: boolean;
  },
>(variants: T[]): T {
  const inStock = variants.filter((v) => v.stock == null || v.stock > 0);
  const pool = inStock.length > 0 ? inStock : variants;

  const onSale = pool.filter((v) => v.sale_price != null);
  const candidates = onSale.length > 0 ? onSale : pool;
  const lowest = candidates.reduce((min, v) =>
    (v.sale_price ?? v.regular_price) < (min.sale_price ?? min.regular_price) ? v : min,
  );
  const tied = candidates.filter(
    (v) => (v.sale_price ?? v.regular_price) === (lowest.sale_price ?? lowest.regular_price),
  );
  return tied.length > 1 ? (tied.find((v) => v.is_default) ?? lowest) : lowest;
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
