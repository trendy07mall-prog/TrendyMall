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

export type ComboSize = "small" | "medium" | "centre";

// Every measurement the design calls for, in one place, so the three
// sizes cannot drift apart as the file grows.
const SIZES = {
  small: {
    w: 190,
    h: 330,
    radius: "20px",
    pad: "14px",
    imageRadius: "14px",
    badge: "text-[11px]",
    name: "text-[15px]",
    price: "text-[18px]",
    was: "text-[12px]",
    button: "text-[13px] py-2.5",
    gap: "gap-2",
    image: 135,
  },
  medium: {
    w: 220,
    h: 380,
    radius: "22px",
    pad: "16px",
    imageRadius: "16px",
    badge: "text-[12px]",
    name: "text-[16px]",
    price: "text-[20px]",
    was: "text-[12px]",
    button: "text-[14px] py-3",
    gap: "gap-2.5",
    image: 164,
  },
  centre: {
    w: 300,
    h: 480,
    radius: "26px",
    pad: "20px",
    imageRadius: "18px",
    badge: "text-[13px]",
    name: "text-[20px]",
    price: "text-[28px]",
    was: "text-[14px]",
    button: "text-[15px] py-3.5",
    gap: "gap-3",
    image: 220,
  },
} as const;

const TINT = "#FFF4EC";
const CARD_BORDER = "#F3D9C6";
const ORANGE = "#F97316";
const NAVY = "#0F2D52";
const EMERALD = "#16A34A";
const GREY = "#6B7280";

export interface ComboCardData {
  product: ProductWithPrimaryImage;
  // How many products are inside. Shown only on the featured card.
  itemCount: number;
}

export function ComboCard({
  data,
  size,
  featured = false,
  // Mobile cards are a fixed pixel width set by the carousel and grow to
  // fill it, rather than taking one of the three desktop sizes.
  fluid = false,
}: {
  data: ComboCardData;
  size: ComboSize;
  featured?: boolean;
  fluid?: boolean;
}) {
  const { product, itemCount } = data;
  const s = SIZES[size];

  // The price the customer pays, exactly as every other card computes it.
  const price = product.special_price ?? product.actual_price;
  const separately = product.bundleSeparateTotal;
  const saving = separately != null ? bundleSaving(separately, price) : 0;
  // A bundle's stock IS its availability (sql/089), and it is 0 whenever
  // anything inside has been unpublished or has run out (sql/091).
  const available = product.stock > 0;

  return (
    <article
      className={`flex shrink-0 flex-col overflow-hidden transition-[width,height,box-shadow] duration-300 ease-out ${
        size === "small" ? "opacity-85" : ""
      }`}
      style={{
        width: fluid ? "100%" : s.w,
        height: fluid ? undefined : s.h,
        backgroundColor: TINT,
        borderRadius: fluid ? "24px" : s.radius,
        padding: fluid ? "16px" : s.pad,
        border: featured ? `2px solid ${ORANGE}` : `1px solid ${CARD_BORDER}`,
        boxShadow: featured ? "0 18px 40px rgba(249,115,22,0.18)" : undefined,
      }}
    >
      {/* Everything except the button is one link to the bundle page.
          The button is a sibling, not a child: a <button> inside an <a>
          is invalid and breaks keyboard use. */}
      <Link
        href={`/product/${product.slug}`}
        className={`flex min-h-0 flex-1 flex-col ${s.gap} rounded-[8px] focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:outline-none`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          {saving > 0 ? (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 font-extrabold text-white ${s.badge}`}
              style={{ backgroundColor: ORANGE }}
            >
              SAVE {formatPrice(saving)}
            </span>
          ) : (
            <span />
          )}
          {featured && itemCount > 0 && (
            <span className={`font-bold ${s.badge}`} style={{ color: EMERALD }}>
              {itemCount} items
            </span>
          )}
        </div>

        {/* Square, white, object-contain: the bundle photo is shown
            whole -- nothing cropped, nothing stretched. A fixed size
            rather than aspect-ratio, because inside a fixed-height flex
            column an aspect-ratio box takes the full width and leaves
            the name nothing, and flexbox then crushes it. */}
        <div
          className="relative mx-auto shrink-0 overflow-hidden bg-white"
          style={{
            width: fluid ? "100%" : s.image,
            height: fluid ? undefined : s.image,
            aspectRatio: fluid ? "1 / 1" : undefined,
            borderRadius: s.imageRadius,
          }}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt=""
              fill
              sizes={fluid ? "286px" : `${s.image}px`}
              className="object-contain"
            />
          ) : (
            <span
              className="absolute inset-0 flex items-center justify-center text-xs"
              style={{ color: GREY }}
            >
              No photo
            </span>
          )}
        </div>

        <h3
          className={`line-clamp-2 shrink-0 font-extrabold ${fluid ? "text-[20px]" : s.name}`}
          style={{ color: "#111111" }}
        >
          {product.name}
        </h3>

        <div className="mt-auto flex shrink-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={`font-extrabold ${fluid ? "text-[26px]" : s.price}`}
            style={{ color: NAVY }}
          >
            {formatPrice(price)}
          </span>
          {separately != null && separately > price && (
            <span className={`line-through ${s.was}`} style={{ color: GREY }}>
              {formatPrice(separately)}
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3 shrink-0">
        <ComboBuyNowButton
          product={product}
          available={available}
          className={`w-full rounded-[13px] font-extrabold ${fluid ? "py-[15px] text-[15px]" : s.button}`}
        />
      </div>
    </article>
  );
}
