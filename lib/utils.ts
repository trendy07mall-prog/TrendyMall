// Site-wide display rule: "Rs" prefix, no decimals, on every price shown
// anywhere (original/struck-through and current/sale alike) -- rounds to
// the nearest whole rupee (Intl's default fraction-digit rounding is
// round-half-away-from-zero) purely for display. Stored values, cart math,
// discount/coupon calculations, and checkout totals are never touched by
// this -- they keep full numeric precision; only the rendered text drops
// decimals.
const priceFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
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
// campaign_price is an OPTIONAL, additive layer (populated by
// lib/data/campaigns.ts's getActiveCampaignPricesForVariants, spread onto
// the variant object before this is called) -- when absent, Math.min's
// second argument is Infinity and this is byte-identical to before
// campaigns existed. A campaign can only ever lower the effective price,
// never raise it, matching the "campaign_price never overwrites
// regular_price/sale_price" rule -- this function still just READS
// whatever's cheapest, it never mutates either column.
export function getVariantPrice(variant: {
  regular_price: number;
  sale_price: number | null;
  campaign_price?: number | null;
}): number {
  return Math.min(variant.sale_price ?? variant.regular_price, variant.campaign_price ?? Infinity);
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
// that pool: cheapest effective price wins if any variant is discounted
// (via sale_price OR an active campaign_price), else cheapest regular
// price; ties break on is_default.
export function pickWinningVariant<
  T extends {
    regular_price: number;
    sale_price: number | null;
    campaign_price?: number | null;
    stock: number | null;
    is_default: boolean;
  },
>(variants: T[]): T {
  const inStock = variants.filter((v) => v.stock == null || v.stock > 0);
  const pool = inStock.length > 0 ? inStock : variants;

  // "Discounted" means sale_price set OR an active campaign that actually
  // undercuts regular_price. Deliberately kept as a literal OR (not
  // "getVariantPrice(v) < v.regular_price") so a pre-existing bad-data
  // edge case -- a variant with sale_price >= regular_price -- keeps
  // behaving exactly as it did before campaigns existed: still treated as
  // "on sale" and included in the pool.
  const discounted = pool.filter(
    (v) => v.sale_price != null || (v.campaign_price != null && v.campaign_price < v.regular_price),
  );
  const candidates = discounted.length > 0 ? discounted : pool;
  const lowest = candidates.reduce((min, v) => (getVariantPrice(v) < getVariantPrice(min) ? v : min));
  const tied = candidates.filter((v) => getVariantPrice(v) === getVariantPrice(lowest));
  return tied.length > 1 ? (tied.find((v) => v.is_default) ?? lowest) : lowest;
}

// Which price band actually wins for ONE variant, and why -- shared by
// resolveCardDisplay (lib/data/products.ts, server-side card resolution)
// and ProductPurchaseSection.tsx (client-side PDP display) so both surfaces
// derive campaign pricing the exact same way, never two parallel
// implementations. A campaign_price only "wins" display if it actually
// undercuts both regular_price and whatever sale_price already is -- a
// real tie (campaign_price === sale_price) keeps priceSource "sale," since
// it's the merchant's own price and the number shown is identical either
// way.
export function resolveEffectivePriceBand(variant: {
  regular_price: number;
  sale_price: number | null;
  campaign_price?: number | null;
  campaign_id?: string | null;
  campaign_badge_label?: string | null;
  campaign_name?: string | null;
  campaign_end_at?: string | null;
}): {
  specialPrice: number | null;
  campaignId: string | null;
  priceSource: "regular" | "sale" | "campaign";
  badgeLabel: string | null;
  campaignName: string | null;
  campaignEndAt: string | null;
} {
  const campaignBeats =
    variant.campaign_price != null &&
    variant.campaign_price < variant.regular_price &&
    variant.campaign_price < (variant.sale_price ?? Infinity);

  const priceSource: "regular" | "sale" | "campaign" = campaignBeats
    ? "campaign"
    : variant.sale_price != null
      ? "sale"
      : "regular";
  const specialPrice = campaignBeats ? (variant.campaign_price as number) : variant.sale_price;
  const campaignId = campaignBeats ? (variant.campaign_id ?? null) : null;
  const badgeLabel = campaignBeats ? (variant.campaign_badge_label ?? null) : null;
  const campaignName = campaignBeats ? (variant.campaign_name ?? null) : null;
  const campaignEndAt = campaignBeats ? (variant.campaign_end_at ?? null) : null;

  return { specialPrice, campaignId, priceSource, badgeLabel, campaignName, campaignEndAt };
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
