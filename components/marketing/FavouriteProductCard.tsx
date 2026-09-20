"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Heart, ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/components/ui/ToastProvider";
import { trackConversion } from "@/lib/analytics/track";
import { formatPrice } from "@/lib/utils";
import { discountPercent, shortDescription } from "@/lib/customer-favourites";
import type { FavouriteProduct } from "@/lib/data/customer-favourites";

// The horizontal card in the homepage's Customer Favourites carousel:
// image on the left, details on the right, buttons pinned to the bottom.
//
// The whole card is a link EXCEPT the two buttons. That is done with a
// stretched overlay link rather than by wrapping everything in an <a>:
// a <button> inside an <a> is invalid markup and breaks keyboard
// activation. The overlay sits under the buttons, so Tab still reaches the
// card link, Add to Cart and the wishlist toggle as three separate
// controls.

const ADDED_MS = 2000;
const STARS = [0, 1, 2, 3, 4];

function RatingRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Desktop: the full five. Half-filled states come from the same
          percentage-overlay technique StarRating uses elsewhere. */}
      <span
        className="relative hidden md:inline-flex"
        role="img"
        aria-label={`Rated ${rating} out of 5 by ${count} customers`}
      >
        <span className="flex gap-0.5">
          {STARS.map((i) => (
            <Star key={i} className="h-[15px] w-[15px] text-[#E5E7EB]" fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        <span
          className="absolute inset-0 flex gap-0.5 overflow-hidden"
          style={{ width: `${Math.max(0, Math.min(100, (rating / 5) * 100))}%` }}
        >
          {STARS.map((i) => (
            <Star key={i} className="h-[15px] w-[15px] shrink-0 text-[#F97316]" fill="currentColor" strokeWidth={0} />
          ))}
        </span>
      </span>
      {/* Mobile: one star is enough next to the number. */}
      <Star
        className="h-3.5 w-3.5 text-[#F97316] md:hidden"
        fill="currentColor"
        strokeWidth={0}
        aria-hidden="true"
      />
      <span className="text-xs font-semibold text-[#111111] md:text-[13px]">{rating.toFixed(1)}</span>
      <span className="text-xs text-[#6B7280] md:text-[13px]">({count})</span>
    </div>
  );
}

export function FavouriteProductCard({
  product,
  badge,
}: {
  product: FavouriteProduct;
  badge: string;
}) {
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  const { showToast } = useToast();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  // Survives the re-render the success state causes, so a second tap
  // during the success window can't queue a second add.
  const busyRef = useRef(false);

  const price = product.special_price ?? product.actual_price;
  const percent = discountPercent(product.actual_price, product.special_price);
  const description = shortDescription(product);
  const wishlisted = has(product.id);
  const href = `/product/${product.slug}`;
  // More than one variant means there is a real choice to make (colour,
  // size); the card must not pick one on the customer's behalf.
  const needsVariantChoice = product.variantCount > 1;

  function handleAddToCart() {
    if (busyRef.current) return;

    if (needsVariantChoice) {
      router.push(href);
      return;
    }

    busyRef.current = true;
    setStatus("adding");
    try {
      if (product.stock <= 0) throw new Error("out_of_stock");
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price,
        image: product.image,
        quantity: 1,
        variantId: product.defaultVariantId || null,
        variantName: null,
        variantColorHex: null,
        attributeSelections: [],
      });
      trackConversion("AddToCart", {
        productId: product.id,
        value: price,
        pixelParams: {
          content_ids: [product.id],
          content_name: product.name,
          content_type: "product",
          value: price,
          currency: "LKR",
        },
      });
      setStatus("added");
      setTimeout(() => {
        setStatus("idle");
        busyRef.current = false;
      }, ADDED_MS);
    } catch {
      setStatus("idle");
      busyRef.current = false;
      showToast(
        product.stock <= 0
          ? `${product.name} just went out of stock.`
          : "Could not add that to your cart. Please try again.",
        { variant: "error" },
      );
    }
  }

  return (
    <article
      className={`group relative flex h-[216px] w-full gap-3 rounded-xl bg-[#F3F4F6] p-3.5 transition-[transform,box-shadow] duration-200 md:h-[292px] md:gap-[18px] md:p-5 ${
        // No lift for anyone who has asked for less motion.
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_10px_28px_rgba(15,45,82,0.10)]"
      }`}
    >
      {/* The card-wide link. Under the buttons in the stacking order, so
          they stay clickable, and labelled by the product name. */}
      <Link href={href} className="absolute inset-0 z-0 rounded-xl" aria-label={product.name}>
        <span className="sr-only">{product.name}</span>
      </Link>

      {/* Image column */}
      <div className="relative w-[104px] shrink-0 md:w-[160px]">
        <span className="absolute top-0 left-0 z-10 inline-flex items-center gap-1 rounded-md bg-[#0F2D52] px-2 py-1 text-[10px] font-semibold text-white md:px-2.5 md:text-[11px]">
          <Star className="h-3 w-3 text-[#F97316]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
          {badge}
        </span>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            // Fixed box (the column width above), so there is no reflow
            // when the image lands.
            sizes="(min-width: 768px) 160px, 104px"
            loading="lazy"
            className="object-contain drop-shadow-[0_6px_14px_rgba(15,45,82,0.16)]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-lg bg-white text-xs text-[#6B7280]">
            No image
          </span>
        )}
      </div>

      {/* Details column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* shrink-0 matters: the card has a fixed height and the button row
            is pushed down with mt-auto, so without it flex compresses this
            two-line box on cards whose name only fills one line -- which
            dropped the price row a few pixels out of line from card to
            card (measured 61/68/70px from the card top). Held at exactly
            two lines, every card's price, rating and description start at
            the same y. */}
        <h3 className="font-heading line-clamp-2 h-[38px] shrink-0 text-[14.5px] leading-[19px] font-semibold text-[#0F2D52] md:h-11 md:text-[17px] md:leading-[22px]">
          {product.name}
        </h3>

        <p className="font-heading mt-1 shrink-0 text-[19px] font-bold text-[#111111] md:mt-1.5 md:text-[22px]">
          {formatPrice(price)}
        </p>

        {percent != null && (
          <p className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-[#6B7280] line-through md:text-[13px]">
              {formatPrice(product.actual_price)}
            </span>
            <span className="rounded-md bg-[#FEF2F2] px-1.5 py-0.5 text-[11px] font-semibold text-[#DC2626] md:text-xs">
              -{percent}%
            </span>
          </p>
        )}

        {/* Only ever rendered when real customers have reviewed it -- never
            an empty five-star row. */}
        {product.reviewCount > 0 && (
          <div className="mt-1 md:mt-1.5">
            <RatingRow rating={product.avgRating} count={product.reviewCount} />
          </div>
        )}

        {/* max-md:hidden, NOT "hidden md:block": line-clamp-2 works by
            setting display:-webkit-box, and md:block would overwrite that
            display at exactly the breakpoint where the line is shown --
            which silently un-clamped it and let four lines render down into
            the button row. Hiding via max-md: leaves the clamp's own
            display rule intact. */}
        {description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-[19px] text-[#6B7280] max-md:hidden">
            {description}
          </p>
        )}

        {/* Pinned to the bottom, above the card link so both stay clickable. */}
        <div className="relative z-10 mt-auto flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={status !== "idle"}
            aria-label={
              needsVariantChoice
                ? `Choose options for ${product.name}`
                : `Add ${product.name} to cart`
            }
            className={`transition-brand flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white disabled:cursor-default ${
              status === "added" ? "bg-[#15803D]" : "bg-[#0F2D52] hover:bg-[#163B69]"
            }`}
          >
            {status === "added" ? (
              <>
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate md:hidden">Added</span>
                <span className="hidden truncate md:inline">Added to Cart</span>
              </>
            ) : status === "adding" ? (
              <>
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden="true"
                />
                <span className="sr-only">Adding to cart</span>
              </>
            ) : (
              <>
                <ShoppingCart className="hidden h-4 w-4 shrink-0 md:inline" aria-hidden="true" />
                <span className="truncate">Add to Cart</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              toggle({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price,
                variantId: product.defaultVariantId || null,
                image: product.image,
              })
            }
            aria-pressed={wishlisted}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`transition-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
              wishlisted
                ? "border-[#F97316] bg-[#FFF7ED]"
                : "border-[#E5E7EB] bg-white hover:border-[#0F2D52]"
            }`}
          >
            <Heart
              className={`h-[18px] w-[18px] ${wishlisted ? "text-[#EA580C]" : "text-[#0F2D52]"}`}
              fill={wishlisted ? "currentColor" : "none"}
              strokeWidth={wishlisted ? 0 : 1.75}
            />
          </button>
        </div>
      </div>
    </article>
  );
}
