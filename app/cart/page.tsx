"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { getDeliveryFee } from "@/lib/shipping-rates";
import { getCartValidation } from "@/lib/cart-validation";
import { getCartRecommendations } from "@/lib/cart-recommendations";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { CouponForm } from "@/components/cart/CouponForm";
import { DeliveryAreaToggle } from "@/components/cart/DeliveryAreaToggle";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { Skeleton } from "@/components/ui/Skeleton";
import { ShoppingBagIcon, LockIcon } from "@/components/ui/Icon";
import type { CartItemValidation } from "@/lib/cart-validation";
import type { DeliveryArea } from "@/components/cart/DeliveryAreaToggle";
import type { ProductWithPrimaryImage } from "@/types";

export default function CartPage() {
  const { items, subtotal, notes, setNotes } = useCart();
  const router = useRouter();
  const [validation, setValidation] = useState<Map<string, CartItemValidation>>(new Map());
  const [recommendations, setRecommendations] = useState<ProductWithPrimaryImage[]>([]);
  // Compared against `itemsKey` at render time (rather than a separate
  // `loading` boolean flipped inside the effect) so nothing needs to call
  // setState synchronously in the effect body — only inside the async
  // `.then()` below, once results actually arrive for that key.
  const [recommendationsKey, setRecommendationsKey] = useState<string | null>(null);
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>(null);
  const [discount, setDiscount] = useState(0);
  const [redirecting, startRedirect] = useTransition();
  const stickyBarRef = useRef<HTMLDivElement>(null);

  // Keyed by the item-id/quantity list (not on every render) — re-checks
  // live stock/availability whenever the cart's contents change. This is
  // the lighter, Phase 1 version of the full re-validation Phase 4 adds
  // for the persisted cart.
  const itemsKey = items.map((i) => `${i.productId}:${i.quantity}`).join(",");

  useEffect(() => {
    // No setState needed when the cart is empty — that branch renders the
    // empty-cart state below and never reads `validation`.
    if (items.length === 0) return;
    let cancelled = false;
    getCartValidation(
      items.map((i) => ({ productId: i.productId, price: i.price, quantity: i.quantity })),
    ).then((results) => {
      if (cancelled) return;
      setValidation(new Map(results.map((r) => [r.productId, r])));
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
  // global ToastProvider (mounted in app/layout.tsx) via a CSS variable,
  // so cart-page toasts shift up above it instead of being covered. Every
  // other page falls back to the variable's default of 0px.
  useEffect(() => {
    const el = stickyBarRef.current;
    if (!el) return;
    const updateOffset = () => {
      document.documentElement.style.setProperty(
        "--mobile-toast-offset",
        `${el.getBoundingClientRect().height + 16}px`,
      );
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--mobile-toast-offset");
    };
  }, [items.length]);

  const unavailableItems = items.filter((item) => validation.get(item.productId)?.available === false);
  const hasBlockingIssue = unavailableItems.length > 0;
  const recommendationsLoading = recommendationsKey !== itemsKey;

  const deliveryFee =
    deliveryArea === null ? null : getDeliveryFee(deliveryArea === "colombo" ? "Colombo" : "Other", "standard");
  const total = Math.max(0, subtotal + (deliveryFee ?? 0) - discount);

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
              <li key={item.productId}>{item.name}</li>
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
            <li key={item.productId}>
              <CartItemCard item={item} validation={validation.get(item.productId)} />
            </li>
          ))}
        </ul>

        <div className="h-fit rounded-[20px] border border-[var(--border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          <h2 className="text-lg font-medium">Order Summary</h2>

          <div className="mt-4">
            <DeliveryAreaToggle value={deliveryArea} onChange={setDeliveryArea} />
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--muted)]">
              <span>Delivery</span>
              {deliveryFee === null ? (
                <span>
                  {formatPrice(getDeliveryFee("Colombo", "standard"))} –{" "}
                  {formatPrice(getDeliveryFee("Other", "standard"))}
                </span>
              ) : (
                <span>{formatPrice(deliveryFee)}</span>
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
              onPreview={(nextDiscount) => setDiscount(nextDiscount)}
            />
          </div>

          <div className="mt-4 flex justify-between border-t border-[var(--border)] pt-4 text-base font-medium">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {deliveryFee === null && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Select a delivery area above for an exact total, or see our{" "}
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
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky-bar)] flex items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card-hover)] lg:hidden"
      >
        <div className="flex flex-col">
          <span className="text-xs text-[var(--muted)]">Total</span>
          <span className="text-base font-medium">{formatPrice(total)}</span>
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
