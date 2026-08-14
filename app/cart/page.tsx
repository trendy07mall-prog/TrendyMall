"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { cartLineKey, formatPrice } from "@/lib/utils";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE, calculateDeliveryFee, type DeliveryZone } from "@/lib/delivery-fee";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { getMyDefaultAddress } from "@/lib/addresses";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import { getCartValidation, getCartFreeShipping } from "@/lib/cart-validation";
import { getShippingSettings, type ShippingSettings } from "@/lib/data/settings";
import { getCartRecommendations } from "@/lib/cart-recommendations";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { CouponForm } from "@/components/cart/CouponForm";
import { DeliveryAreaToggle } from "@/components/cart/DeliveryAreaToggle";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { ShoppingBagIcon, LockIcon } from "@/components/ui/Icon";
import type { CartItemValidation } from "@/lib/cart-validation";
import type { DeliveryArea } from "@/components/cart/DeliveryAreaToggle";
import type { CustomerAddress, ProductWithPrimaryImage } from "@/types";

export default function CartPage() {
  const { items, subtotal, notes, setNotes, syncPrices } = useCart();
  const router = useRouter();
  const { showToast } = useToast();
  const [validation, setValidation] = useState<Map<string, CartItemValidation>>(new Map());
  const [freeShipping, setFreeShipping] = useState(false);
  const [recommendations, setRecommendations] = useState<ProductWithPrimaryImage[]>([]);
  // Compared against `itemsKey` at render time (rather than a separate
  // `loading` boolean flipped inside the effect) so nothing needs to call
  // setState synchronously in the effect body — only inside the async
  // `.then()` below, once results actually arrive for that key.
  const [recommendationsKey, setRecommendationsKey] = useState<string | null>(null);
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>(null);
  const [defaultAddress, setDefaultAddress] = useState<CustomerAddress | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponIsFreeShipping, setCouponIsFreeShipping] = useState(false);
  const [redirecting, startRedirect] = useTransition();
  const stickyBarRef = useRef<HTMLDivElement>(null);

  // Keyed by the item-id/quantity list (not on every render) — re-checks
  // live stock/availability whenever the cart's contents change. This is
  // the lighter, Phase 1 version of the full re-validation Phase 4 adds
  // for the persisted cart.
  const itemsKey = items
    .map((i) => `${i.productId}:${i.variantId ?? "base"}:${i.quantity}`)
    .join(",");

  useEffect(() => {
    // No setState needed when the cart is empty — that branch renders the
    // empty-cart state below and never reads `validation`.
    if (items.length === 0) return;
    let cancelled = false;
    getCartValidation(
      items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        price: i.price,
        quantity: i.quantity,
      })),
    ).then((results) => {
      if (cancelled) return;
      setValidation(new Map(results.map((r) => [cartLineKey(r.productId, r.variantId), r])));

      // A campaign starting/ending while an item sat in the cart is the
      // one case getCartValidation already detects (currentPrice/
      // priceChanged) but nothing consumed until now -- sync it in place
      // and say so, rather than silently showing a stale number.
      const changed = results.filter((r) => r.priceChanged && r.currentPrice != null);
      if (changed.length > 0) {
        syncPrices(
          changed.map((r) => ({
            productId: r.productId,
            variantId: r.variantId,
            price: r.currentPrice as number,
          })),
        );
        const names = changed
          .map((r) => items.find((i) => cartLineKey(i.productId, i.variantId) === cartLineKey(r.productId, r.variantId))?.name)
          .filter((n): n is string => !!n);
        showToast(
          changed.length === 1 && names[0]
            ? `Price updated for ${names[0]}`
            : `Prices updated for ${changed.length} items`,
        );
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    getCartFreeShipping(items.map((i) => i.variantId)).then((result) => {
      if (!cancelled) setFreeShipping(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  useEffect(() => {
    // No setState needed when the cart is empty — that branch renders the
    // empty-cart state below and never reads `recommendations`.
    if (items.length === 0) return;
    let cancelled = false;
    getCartRecommendations(items.map((i) => i.productId)).then((results) => {
      if (cancelled) return;
      setRecommendations(results);
      setRecommendationsKey(itemsKey);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  // Announces the mobile sticky checkout bar's rendered height to the
  // global ToastProvider and WhatsAppButton (mounted in app/layout.tsx)
  // via a CSS variable, so cart-page toasts and the FAB shift up above it
  // instead of being covered. Every other page falls back to the
  // variable's default of 0px. Guarded on height > 0 so this bar being
  // `display:none` at desktop widths (lg:hidden) publishes 0px instead of
  // a stray 16px — a real height, not an assumption, drives the offset.
  useEffect(() => {
    const el = stickyBarRef.current;
    if (!el) return;
    const updateOffset = () => {
      const height = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        "--mobile-bottom-bar-offset",
        height > 0 ? `${height + 16}px` : "0px",
      );
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--mobile-bottom-bar-offset");
    };
  }, [items.length]);

  // A logged-in customer with a saved default address gets a real,
  // address-based estimate instead of the area toggle's guess — fetched
  // once, client-side (this page has no server-rendered data fetch of its
  // own). Resolves to null for a guest or a customer with no addresses
  // saved yet, both of which fall back to the toggle below.
  useEffect(() => {
    let cancelled = false;
    getMyDefaultAddress().then((address) => {
      if (!cancelled) setDefaultAddress(address);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getActiveDeliveryZones(), getShippingSettings()]).then(([zoneResults, settings]) => {
      if (cancelled) return;
      setZones(zoneResults);
      setShippingSettings(settings);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const unavailableItems = items.filter(
    (item) => validation.get(cartLineKey(item.productId, item.variantId))?.available === false,
  );
  const hasBlockingIssue = unavailableItems.length > 0;
  const recommendationsLoading = recommendationsKey !== itemsKey;

  // The cart has no delivery address of its own to price from — the real
  // fee always requires the postal code entered at checkout
  // (lib/delivery-fee.ts). "Outside Colombo" has no ambiguity (always
  // Rs.400), but a bare "Colombo" toggle selection could still resolve to
  // either rate depending on the exact zone, so it's shown as a floor
  // ("from Rs.255"), never a firm figure — a firm number here is what
  // created the reported mismatch. Once a default address is known, its
  // real district/postal code replaces the guess entirely.
  // Zone-derived floor/ceiling for the toggle-based estimate, before an
  // exact address is known — falls back to the hardcoded constants only
  // until the zones fetch resolves (never blocks first paint on it).
  const colomboZone = zones.find((zone) => zone.districtMatch === "Colombo");
  const defaultZone = zones.find((zone) => zone.isDefault);
  const inZoneRate = colomboZone?.rate ?? RATE_IN_ZONE;
  const outsideZoneRate = defaultZone?.rate ?? RATE_OUTSIDE_ZONE;

  const defaultAddressFee = defaultAddress
    ? calculateDeliveryFee(
        {
          district: defaultAddress.district,
          postalCode: defaultAddress.postal_code,
          deliveryMethod: "standard",
        },
        zones,
      )
    : null;
  const deliveryFee = defaultAddress
    ? defaultAddressFee
    : deliveryArea === "outside"
      ? outsideZoneRate
      : deliveryArea === "colombo"
        ? inZoneRate
        : null;
  // A sitewide free-shipping threshold (Settings) composes with the
  // per-campaign waiver below via OR, never additively — whichever
  // source(s) apply, the fee is waived exactly once.
  const freeShippingFromThreshold =
    !!shippingSettings?.freeShippingEnabled && subtotal >= (shippingSettings?.freeShippingMinAmount ?? 0);
  const freeShippingActive = freeShipping || freeShippingFromThreshold;
  // A free_shipping-type coupon (discount already === deliveryFee, see
  // CouponForm) and a campaign's/threshold's free-shipping waiver can both
  // be "active" at once without conflicting -- but naively subtracting both
  // would double-waive the same delivery fee. The campaign/threshold only
  // contributes whatever portion the coupon hasn't already covered.
  const deliveryFeeValue = deliveryFee ?? 0;
  const shippingWaivedByCoupon = couponIsFreeShipping ? deliveryFeeValue : 0;
  const campaignShippingWaiver = freeShippingActive ? Math.max(0, deliveryFeeValue - shippingWaivedByCoupon) : 0;
  const total = Math.max(0, subtotal + deliveryFeeValue - discount - campaignShippingWaiver);
  // A bare total with no delivery area selected would silently omit a
  // real Rs.255-400 charge — read as "delivery is free" and then surprise
  // the customer at checkout. Both the desktop summary and the mobile
  // sticky bar render this exact string (never their own separately
  // computed formatPrice(total)) so they're structurally incapable of
  // disagreeing, not just carefully kept in sync by hand.
  const totalDisplay =
    deliveryFee === null && !freeShippingActive
      ? `${formatPrice(Math.max(0, subtotal - discount))} + delivery`
      : formatPrice(total);

  function handleCheckout() {
    if (hasBlockingIssue) return;
    startRedirect(() => {
      router.push("/checkout");
    });
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <ShoppingBagIcon className="h-16 w-16 text-[var(--muted)]" />
        <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">
          Your cart is empty
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Looks like you haven&apos;t added anything yet.
        </p>
        <Link
          href="/shop"
          className="transition-brand mt-6 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:opacity-85"
        >
          Continue Shopping
        </Link>
        <div className="mt-12 w-full text-left">
          <RecentlyViewedSection excludeProductIds={[]} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12 max-sm:pb-28">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="font-heading mt-4 text-3xl font-bold tracking-tight">Your Cart</h1>

      {hasBlockingIssue && (
        <div
          role="alert"
          className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-discount)] bg-[var(--color-discount)]/5 px-4 py-3 text-sm"
        >
          <p className="font-medium text-[var(--color-discount)]">
            {unavailableItems.length === 1
              ? "One item in your cart is no longer available."
              : `${unavailableItems.length} items in your cart are no longer available.`}
          </p>
          <ul className="mt-1 list-inside list-disc text-[var(--muted)]">
            {unavailableItems.map((item) => (
              <li key={cartLineKey(item.productId, item.variantId)}>{item.name}</li>
            ))}
          </ul>
          <p className="mt-1 text-[var(--muted)]">
            Remove {unavailableItems.length === 1 ? "it" : "them"} to continue to checkout.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={cartLineKey(item.productId, item.variantId)}>
              <CartItemCard
                item={item}
                validation={validation.get(cartLineKey(item.productId, item.variantId))}
              />
            </li>
          ))}
        </ul>

        <div className="h-fit rounded-[20px] border border-[var(--border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          <h2 className="text-lg font-medium">Order Summary</h2>

          <div className="mt-4">
            {defaultAddress ? (
              <p className="text-xs text-[var(--muted)]">
                Delivery to your default address — {defaultAddress.city}, {defaultAddress.district}.{" "}
                <Link href="/account/addresses" className="underline">
                  Change
                </Link>
              </p>
            ) : (
              <DeliveryAreaToggle value={deliveryArea} onChange={setDeliveryArea} />
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--muted)]">
              <span>Delivery</span>
              {freeShippingActive ? (
                <span className="font-medium text-[var(--color-discount)]">Free (Promotion)</span>
              ) : defaultAddress ? (
                <span>{formatPrice(defaultAddressFee ?? 0)}</span>
              ) : deliveryArea === null ? (
                <span>
                  {formatPrice(inZoneRate)} – {formatPrice(outsideZoneRate)}
                </span>
              ) : deliveryArea === "colombo" ? (
                <span>from {formatPrice(inZoneRate)} — calculated at checkout</span>
              ) : (
                <span>{formatPrice(outsideZoneRate)}</span>
              )}
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[var(--color-discount)]">
                <span>Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
          </div>

          <div className="mt-4">
            <CouponForm
              subtotal={subtotal}
              deliveryFee={deliveryFee ?? 0}
              onPreview={(nextDiscount, _label, isFreeShipping) => {
                setDiscount(nextDiscount);
                setCouponIsFreeShipping(isFreeShipping);
              }}
            />
          </div>

          <div className="mt-4 flex justify-between border-t border-[var(--border)] pt-4 text-base font-medium">
            <span>Total</span>
            <span>{totalDisplay}</span>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Estimated delivery: {getEstimatedDeliveryRange().label.replace(/^Get it by /, "")}
          </p>
          {!defaultAddress && deliveryArea !== "outside" && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {deliveryArea === "colombo"
                ? "Your exact delivery fee is calculated at checkout from your postal code"
                : "Select a delivery area above for an exact total"}
              , or see our{" "}
              <Link href="/shipping" className="underline">
                Shipping Policy
              </Link>
              .
            </p>
          )}

          <div className="mt-4 flex flex-col gap-1">
            <label htmlFor="cart-notes" className="text-xs text-[var(--muted)]">
              Order notes (optional)
            </label>
            <textarea
              id="cart-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note for the seller…"
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
            />
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={hasBlockingIssue || redirecting}
            className="transition-brand mt-6 hidden w-full items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
          >
            <LockIcon className="h-4 w-4" />
            {redirecting ? "Redirecting…" : "Proceed to Checkout"}
          </button>
          <Link
            href="/shop"
            className="mt-3 block text-center text-sm text-[var(--muted)] underline"
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>

      {recommendationsLoading ? (
        <div className="mt-16">
          <Skeleton className="h-6 w-48" />
          <div className="mt-4 flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-44 shrink-0 sm:w-56" />
            ))}
          </div>
        </div>
      ) : (
        <RelatedProducts products={recommendations} />
      )}
      <RecentlyViewedSection excludeProductIds={items.map((i) => i.productId)} />

      <div
        ref={stickyBarRef}
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky-bar)] flex items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--color-card)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-card-hover)] lg:hidden"
      >
        <div className="flex flex-col">
          <span className="text-xs text-[var(--muted)]">Total</span>
          <span className="text-base font-medium">{totalDisplay}</span>
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={hasBlockingIssue || redirecting}
          className="transition-brand flex items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LockIcon className="h-4 w-4" />
          {redirecting ? "Redirecting…" : "Checkout"}
        </button>
      </div>
    </div>
  );
}
