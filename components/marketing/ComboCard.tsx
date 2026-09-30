import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { bundleSaving } from "@/lib/bundles";
import { ComboBuyNowButton } from "@/components/marketing/ComboBuyNowButton";
import type { ProductWithPrimaryImage } from "@/types";

// One bundle, as a Combo Deals card. Used by the homepage carousel and
// by /combo-deals, and by nothing else -- New Arrivals, the shop grid,
// category pages and every other product card keep their own ProductCard
// untouched.
//
// PRESENTATION ONLY. The price, the saving and whether it can be bought
// all arrive already decided: special_price/actual_price come from the
// same pricing path every other card uses, bundleSeparateTotal from
// lib/data/bundles.ts, and `stock` is the number sql/089 keeps equal to
// how many whole bundles the contents allow (0 whenever anything inside
// cannot be sold). Nothing here recalculates any of it.
//
// The card is compact on purpose: the photo is the biggest thing on it,
// the badges sit ON the photo rather than taking a row of their own, and
// the height is whatever the content needs rather than a fixed number --
// a fixed height was what left the old card half empty.

export type ComboVariant = "centre" | "side" | "outer" | "mobile" | "grid";

// Every measurement in one place, so the five variants cannot drift.
// `w: null` means the width comes from the wrapper (the mobile swipe
// strip sets it, and the grid column does).
const V = {
  centre: { w: 240, pad: 10, name: 15, price: 20, btnH: 38, btnText: 14, opacity: 1 },
  side: { w: 200, pad: 9, name: 14, price: 18, btnH: 34, btnText: 13, opacity: 1 },
  outer: { w: 180, pad: 8, name: 13, price: 16, btnH: 32, btnText: 12, opacity: 0.85 },
  mobile: { w: null, pad: 10, name: 15, price: 20, btnH: 40, btnText: 14, opacity: 1 },
  grid: { w: null, pad: 10, name: 15, price: 20, btnH: 38, btnText: 14, opacity: 1 },
} as const;

const TINT = "#FFF4EC";
const CARD_BORDER = "#F3D9C6";
const PHOTO_BG = "#F3E8DE";
const ORANGE = "#F97316";
const NAVY = "#0F2D52";
const EMERALD = "#16A34A";
const GREY = "#6B7280";

export interface ComboCardData {
  product: ProductWithPrimaryImage;
  // How many products are inside, shown as a chip on the photo.
  itemCount: number;
}

export function ComboCard({
  data,
  variant,
  featured = false,
}: {
  data: ComboCardData;
  variant: ComboVariant;
  featured?: boolean;
}) {
  const { product, itemCount } = data;
  const v = V[variant];
  // Only used to size the srcset request; the box itself is squared by
  // aspect-ratio below, not by this number.
  const photoHint = v.w === null ? 260 : v.w - v.pad * 2;

  // The price the customer pays, exactly as every other card computes it.
  const price = product.special_price ?? product.actual_price;
  const separately = product.bundleSeparateTotal;
  const saving = separately != null ? bundleSaving(separately, price) : 0;
  // A bundle's stock IS its availability (sql/089), and it is 0 whenever
  // anything inside has been unpublished or has run out (sql/091).
  const available = product.stock > 0;

  return (
    <article
      className="flex flex-col"
      style={{
        width: v.w ?? "100%",
        maxWidth: variant === "grid" ? 260 : undefined,
        padding: v.pad,
        gap: 8,
        backgroundColor: TINT,
        borderRadius: 18,
        border: featured ? `2px solid ${ORANGE}` : `1px solid ${CARD_BORDER}`,
        boxShadow: featured ? "0 12px 28px rgba(249,115,22,0.16)" : undefined,
        opacity: v.opacity,
      }}
    >
      {/* Everything except the button is one link to the bundle page.
          The button is a sibling, not a child: a <button> inside an <a>
          is invalid and breaks keyboard use. */}
      <Link
        href={`/product/${product.slug}`}
        className="flex flex-col gap-2 rounded-[8px] focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {/* The photo fills the card edge to edge -- no inner padding --
            and crops rather than letterboxes, so a non-square photo
            still fills the square. That is why the admin warns about
            keeping the products centred. */}
        {/* aspect-ratio rather than a computed height: the card is
            border-box, so a featured card's 2px border eats into the
            inner width and a height worked out from the card width
            comes out 4px taller than it is wide. This stays square
            whatever the border and padding do. */}
        <div
          className="@container relative w-full overflow-hidden"
          style={{ aspectRatio: "1 / 1", borderRadius: 12, backgroundColor: PHOTO_BG }}
        >
          {product.image && (
            <Image
              src={product.image}
              alt=""
              fill
              sizes={`${photoHint}px`}
              className="object-cover"
            />
          )}

          {/* Both sit ON the photo. Sized against the PHOTO's width
              (@container), not the breakpoint, because the same card is
              240px wide in the carousel and 156px in the two-up grid on
              a phone -- and at 156px the two pills overlapped, clipping
              the saving. Below that width the item count gives way: the
              saving is the reason the card exists, the count is a
              nice-to-have. */}
          {saving > 0 && (
            <span
              className="absolute text-[11px] font-extrabold text-white @[170px]:text-[12px]"
              style={{ top: 8, left: 8, backgroundColor: ORANGE, borderRadius: 999, padding: "4px 10px" }}
            >
              SAVE {formatPrice(saving)}
            </span>
          )}

          {itemCount > 0 && (
            <span
              className="absolute hidden bg-white text-[11px] font-bold @[170px]:inline-block"
              style={{ top: 8, right: 8, color: EMERALD, borderRadius: 999, padding: "4px 8px" }}
            >
              {itemCount} items
            </span>
          )}
        </div>

        {/* One line, ellipsis: a long bundle name must not push the
            price and button around from card to card. */}
        <h3
          className="truncate font-bold"
          style={{ fontSize: v.name, color: "#111111" }}
        >
          {product.name}
        </h3>

        <div className="flex flex-wrap items-baseline" style={{ gap: 6 }}>
          <span className="font-extrabold" style={{ fontSize: v.price, color: NAVY }}>
            {formatPrice(price)}
          </span>
          {separately != null && separately > price && (
            <span className="line-through" style={{ fontSize: 12, color: GREY }}>
              {formatPrice(separately)}
            </span>
          )}
        </div>
      </Link>

      <ComboBuyNowButton
        product={product}
        available={available}
        className="w-full font-bold"
        style={{ height: v.btnH, borderRadius: 10, fontSize: v.btnText }}
      />
    </article>
  );
}
