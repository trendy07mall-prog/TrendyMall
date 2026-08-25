import Image from "next/image";
import { formatPrice, getDiscountPercent } from "@/lib/utils";

// Deliberately NOT the storefront ProductCard -- that pulls WishlistButton/
// QuickAddButton, which perform real cart/wishlist mutations via context
// providers that also wrap admin routes (app/admin/layout.tsx nests inside
// the root layout, so CartProvider/WishlistProvider are present here too).
// Pure presentational, no data-fetching, no context. `image` is already
// resolved by the caller's query the same way every storefront product
// card resolves it (variant's own image, falling back to the product's
// gallery image) -- "No image" now only means there's genuinely none.
export function CampaignPreviewCard({
  name,
  regularPrice,
  campaignPrice,
  image,
}: {
  name: string;
  regularPrice: number;
  campaignPrice: number;
  image: string | null;
}) {
  const discountPercent = getDiscountPercent(regularPrice, campaignPrice);
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-3">
      {image ? (
        <span className="relative block aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
          <Image src={image} alt="" fill sizes="200px" className="object-cover" />
        </span>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-[var(--radius-sm)] bg-black/5 text-xs text-[var(--muted)]">
          No image
        </div>
      )}
      <p className="mt-2 truncate text-sm font-medium">{name}</p>
      <div className="mt-1 flex items-center gap-2 text-sm">
        <span className="font-semibold">{formatPrice(campaignPrice)}</span>
        {campaignPrice < regularPrice && (
          <span className="text-xs text-[var(--muted)] line-through">{formatPrice(regularPrice)}</span>
        )}
        {discountPercent != null && (
          <span className="text-xs font-medium text-[var(--color-discount)]">-{discountPercent}%</span>
        )}
      </div>
    </div>
  );
}
