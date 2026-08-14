"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createOrder, getPayHereCheckoutParams } from "@/lib/orders";
import { previewCoupon } from "@/lib/coupons";
import { getCartValidation, getCartFreeShipping } from "@/lib/cart-validation";
import { uploadPaymentSlip } from "@/lib/uploadPaymentSlip";
import { formatPrice } from "@/lib/utils";
import { describeDeliveryFee, type DeliveryZone } from "@/lib/delivery-fee";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import { PayHereRedirectForm } from "@/components/checkout/PayHereRedirectForm";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { CheckoutAddress, OTHER_COLOMBO_ZONE_VALUE } from "@/components/checkout/CheckoutAddress";
import { PaymentMethodCard } from "@/components/checkout/PaymentMethodCard";
import {
  CashIcon,
  BankIcon,
  CreditCardIcon,
  LockIcon,
  WhatsAppIcon,
  CheckIcon,
  TruckIcon,
  StoreIcon,
} from "@/components/ui/Icon";
import { FieldError } from "@/components/ui/FieldError";
import { getWhatsAppUrl } from "@/lib/site";
import type { CheckoutAddressFields, CheckoutAddressHandle } from "@/components/checkout/CheckoutAddress";
import type { BankTransferSettings, CustomerAddress, DeliveryMethod } from "@/types";
import type { PayHereCheckoutParams } from "@/lib/orders";
import type { ShippingSettings } from "@/lib/data/settings";

const DRAFT_STORAGE_KEY = "trendymall-checkout-draft";

type PaymentMethod = "cod" | "bank_transfer" | "payhere";

// Guests need an unguessable token (the order's own id) to view their
// confirmation page — order_number alone is sequential/guessable. A
// logged-in customer's ownership is enforced by RLS instead, so no token
// is needed on that URL (see sql/037's get_order_confirmation).
function confirmationUrl(orderNumber: string, orderId: string, isLoggedIn: boolean): string {
  return isLoggedIn
    ? `/order-confirmation/${orderNumber}`
    : `/order-confirmation/${orderNumber}?t=${orderId}`;
}

interface FormState {
  email: string;
  notes: string;
  paymentReference: string;
}

const EMPTY_ADDRESS_FIELDS: CheckoutAddressFields = {
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  city: "",
  district: "",
  postalCode: "",
};

type FieldErrors = Partial<Record<"email", string>>;

// Picks the first genuinely selectable method — the customer's remembered
// preference if it's still enabled, otherwise the first enabled method in
// a fixed priority order. Never returns a method whose card is disabled,
// even right after an admin has turned one off.
function pickInitialPaymentMethod(
  preferred: PaymentMethod | null,
  enabled: Record<PaymentMethod, boolean>,
): PaymentMethod {
  if (preferred && enabled[preferred]) return preferred;
  if (enabled.cod) return "cod";
  if (enabled.bank_transfer) return "bank_transfer";
  if (enabled.payhere) return "payhere";
  // All three disabled is blocked by the admin Settings form's own
  // save-time guard — this is only reached if that invariant is ever
  // violated directly at the database layer.
  return "cod";
}

export function CheckoutForm({
  bankDetails,
  payHereEnabled,
  codEnabled,
  bankTransferEnabled,
  addresses,
  preferredPaymentMethod,
  isLoggedIn,
  defaultEmail,
  zones,
  shippingSettings,
}: {
  bankDetails: BankTransferSettings | null;
  payHereEnabled: boolean;
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  addresses: CustomerAddress[];
  // "Remembers last-used method" (Phase 1's Payment Preference field) —
  // never defaults to something currently unselectable (payhere while
  // the feature flag is off).
  preferredPaymentMethod: PaymentMethod | null;
  // Guest checkout (v12 Phase 4) — addresses is always empty for a guest
  // anyway, but this also governs whether CheckoutAddress shows the
  // "save for next time"/edit-scope UI at all.
  isLoggedIn: boolean;
  // A logged-in customer's account email — prefilled but still a normal,
  // fully editable input, never read-only/hidden. Empty for a guest.
  defaultEmail?: string;
  zones: DeliveryZone[];
  shippingSettings: ShippingSettings;
}) {
  const { items, subtotal, clear, couponCode: cartCouponCode, notes: cartNotes, syncPrices } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(() => ({
    email: defaultEmail ?? "",
    notes: cartNotes,
    paymentReference: "",
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    pickInitialPaymentMethod(preferredPaymentMethod, {
      cod: codEnabled,
      bank_transfer: bankTransferEnabled,
      payhere: payHereEnabled,
    }),
  );
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [payHereRedirect, setPayHereRedirect] = useState<{
    checkoutUrl: string;
    params: PayHereCheckoutParams;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Set the instant order creation succeeds, before the redirect is even
  // attempted — the order number is on screen immediately and stays
  // there if router.replace fails for any reason (see handleSubmit).
  const [placedOrder, setPlacedOrder] = useState<{ orderNumber: string; orderId: string } | null>(null);

  const [addressFields, setAddressFields] = useState<CheckoutAddressFields>(EMPTY_ADDRESS_FIELDS);
  const addressRef = useRef<CheckoutAddressHandle>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);

  const [slipPath, setSlipPath] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-filled from a coupon already applied on the cart page, so the
  // customer doesn't have to re-type it here — still just a preview,
  // re-validated from scratch by the server at submit time regardless.
  const [couponInput, setCouponInput] = useState(cartCouponCode ?? "");
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    label: string;
    isFreeShipping: boolean;
  } | null>(null);
  // True only for the mount-time auto-preview of a coupon carried over from
  // the cart — while this is in flight the blank "Coupon code" input must
  // not render, or the round-trip reads as "checkout lost my coupon."
  const [couponAutoApplying, setCouponAutoApplying] = useState(Boolean(cartCouponCode));
  const couponAutoAppliedRef = useRef(false);

  // Pricing keys off the normalized postal code within the Colombo
  // district — see lib/delivery-fee.ts for why (the city text field is
  // typo/synonym-prone; the postal code is Sri Lanka's real, unambiguous
  // system).
  const { fee: shippingFee, reason: deliveryReason } = describeDeliveryFee(
    {
      district: addressFields.district,
      postalCode: addressFields.postalCode,
      deliveryMethod,
    },
    zones,
  );
  // A campaign's free-shipping waiver, a sitewide free-shipping threshold
  // (Settings), and a free_shipping-type coupon can all be "active" without
  // conflicting -- together they only ever top up whatever portion of
  // shippingFee the coupon hasn't already covered, so the same delivery fee
  // is never waived twice. clientShippingFee sent to createOrder stays the
  // real fee either way (matches what create_order_atomic treats as
  // v_delivery_fee before any discount).
  const [freeShippingCampaign, setFreeShippingCampaign] = useState(false);
  const freeShippingFromThreshold =
    shippingSettings.freeShippingEnabled && subtotal >= shippingSettings.freeShippingMinAmount;
  const freeShippingActive = freeShippingCampaign || freeShippingFromThreshold;
  const shippingWaivedByCoupon = appliedCoupon?.isFreeShipping ? shippingFee : 0;
  const campaignShippingWaiver =
    freeShippingActive && deliveryMethod !== "pickup" ? Math.max(0, shippingFee - shippingWaivedByCoupon) : 0;
  const discount = (appliedCoupon?.discount ?? 0) + campaignShippingWaiver;
  const total = Math.max(0, subtotal + shippingFee - discount);

  const itemsKey = items.map((i) => `${i.productId}:${i.variantId ?? "base"}:${i.quantity}`).join(",");
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    getCartFreeShipping(items.map((i) => i.variantId)).then((result) => {
      if (!cancelled) setFreeShippingCampaign(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  // Restores a mid-checkout draft (contact/notes/payment reference/delivery
  // method — not payment method or the file upload, which can't be
  // serialized) after a refresh. Same hydration-safe "read after mount"
  // shape as CartContext.tsx, swapping localStorage for sessionStorage
  // since a checkout draft shouldn't outlive the browser tab.
  useEffect(() => {
    let existingKey: string | null = null;
    try {
      const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm((prev) => ({
          email: parsed.email ?? prev.email,
          notes: parsed.notes ?? prev.notes,
          paymentReference: parsed.paymentReference ?? prev.paymentReference,
        }));
        if (
          parsed.deliveryMethod === "standard" ||
          (parsed.deliveryMethod === "pickup" && shippingSettings.pickupEnabled)
        ) {
          setDeliveryMethod(parsed.deliveryMethod);
        }
        if (typeof parsed.idempotencyKey === "string" && parsed.idempotencyKey) {
          existingKey = parsed.idempotencyKey;
        }
      }
    } catch {
      // ignore corrupted draft data
    }
    // Reused across a page reload mid-checkout (rather than minting a new
    // one every mount) so a retried submission after a lost response is
    // recognized server-side as the same attempt, not a fresh order.
    setIdempotencyKey(existingKey ?? crypto.randomUUID());
    setHydrated(true);
    // shippingSettings comes from a server-fetched prop that never changes
    // after mount — deliberately excluded, same as every other prop this
    // effect reads only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        email: form.email,
        notes: form.notes,
        paymentReference: form.paymentReference,
        deliveryMethod,
        idempotencyKey,
      }),
    );
  }, [form.email, form.notes, form.paymentReference, deliveryMethod, idempotencyKey, hydrated]);

  // Announces the mobile sticky bar's height to the global ToastProvider
  // and WhatsAppButton (same --mobile-bottom-bar-offset handshake as
  // app/cart/page.tsx) so toasts and the FAB shift up above it instead of
  // being covered. Guarded on height > 0 so a `lg:hidden` bar (display:
  // none at desktop widths) publishes 0px, not a stray 16px.
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
  }, []);

  // A preview only — create_order_atomic re-validates the code and
  // recomputes the real discount from scratch at submit time regardless
  // of what this shows (Rule #1: the server is the only source of truth).
  async function handleApplyCoupon(codeOverride?: string, isAutoApply = false) {
    const code = (codeOverride ?? couponInput).trim();
    if (!code) return;
    setCouponChecking(true);
    setCouponError(null);

    const result = await previewCoupon(code, subtotal, shippingFee);

    setCouponChecking(false);

    if (result.error || result.discount == null) {
      setCouponError(
        isAutoApply
          ? `Coupon ${code} could no longer be applied: ${result.error ?? "it's no longer valid."}`
          : (result.error ?? "Invalid coupon code."),
      );
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon({
      code,
      discount: result.discount,
      label: result.label ?? "",
      isFreeShipping: result.isFreeShipping ?? false,
    });
  }

  // Auto-preview a coupon already applied on the cart page, once, so its
  // discount shows here without an extra click. Submit time still
  // re-validates from scratch regardless (see above). Until this
  // resolves, couponAutoApplying keeps the blank "apply a coupon" form
  // from rendering, which would otherwise read as "checkout lost the
  // coupon I already applied."
  //
  // Deliberately keyed on cartCouponCode (not a run-once mount effect):
  // CartContext hydrates its own coupon code from localStorage inside
  // its own effect, which is itself async — on a hard navigation
  // straight into /checkout (refresh, bookmark, external link), that
  // hydration can still be pending on CheckoutForm's first render. A
  // mount-only effect would see cartCouponCode as null at that instant
  // and never get another chance to apply it. Tracking the real value
  // (with a ref so it still only ever auto-applies once) fires
  // correctly whichever render it first becomes available on.
  useEffect(() => {
    if (cartCouponCode && !couponAutoAppliedRef.current) {
      couponAutoAppliedRef.current = true;
      setCouponAutoApplying(true);
      void handleApplyCoupon(cartCouponCode, true).finally(() => {
        setCouponAutoApplying(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartCouponCode]);

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateAll(): boolean {
    const emailError = !form.email.trim()
      ? "Required."
      : form.email.includes("@")
        ? undefined
        : "Enter a valid email.";
    setErrors({ email: emailError });

    let paymentValid = true;
    if (paymentMethod === "bank_transfer" && !form.paymentReference.trim() && !slipPath) {
      setPaymentError("Provide a bank slip or a reference number.");
      paymentValid = false;
    } else {
      setPaymentError(null);
    }

    return !emailError && paymentValid;
  }

  async function handleSlipChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSlipError(null);
    setSlipUploading(true);

    const formData = new FormData();
    formData.set("file", file);

    // A request that fails before uploadPaymentSlip's own code runs (e.g.
    // exceeding the platform's request body limit) throws rather than
    // returning {error} -- without this catch, slipUploading would stay
    // true forever with no message shown, and the form's submit button
    // stays disabled indefinitely (see the disabled={... || slipUploading}
    // checks below).
    let result;
    try {
      result = await uploadPaymentSlip(formData);
    } catch {
      setSlipUploading(false);
      setSlipError("Upload failed — please try a smaller file or try again.");
      setSlipPath(null);
      setSlipFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSlipUploading(false);

    if (result.error) {
      setSlipError(result.error);
      setSlipPath(null);
      setSlipFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSlipPath(result.path ?? null);
    setSlipFileName(file.name);
    setPaymentError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (items.length === 0) {
      setSubmitError("Your cart is empty.");
      return;
    }
    if (!validateAll()) return;

    setPending(true);

    // Proactive, not reactive: without this, the first sign of a price
    // that changed since it was added to cart (a campaign starting/ending
    // mid-session) would be create_order_atomic's generic rejection.
    // Checking here first means the customer sees the corrected total
    // immediately and can just resubmit, instead of retrying blind against
    // a total that will fail again.
    const revalidation = await getCartValidation(
      items.map((i) => ({ productId: i.productId, variantId: i.variantId, price: i.price, quantity: i.quantity })),
    );
    const changed = revalidation.filter((r) => r.priceChanged && r.currentPrice != null);
    if (changed.length > 0) {
      syncPrices(
        changed.map((r) => ({ productId: r.productId, variantId: r.variantId, price: r.currentPrice as number })),
      );
      setPending(false);
      setSubmitError("Some prices in your cart just changed — please review your order below and try again.");
      return;
    }

    const resolvedAddress = await addressRef.current!.resolveForSubmit();
    if (resolvedAddress.error) {
      setPending(false);
      setSubmitError(resolvedAddress.error);
      return;
    }
    const shipping = resolvedAddress.fields;
    // Pickup orders don't collect (or require) a real shipping address —
    // create_order_atomic now trusts these fields verbatim for pickup
    // (sql/068), so this is what makes the stored order/shipping_addresses
    // rows say something meaningful instead of blank strings. Money is
    // unaffected either way: the delivery fee for pickup stays
    // server-hardcoded to 0 regardless of what's sent here.
    const isPickup = deliveryMethod === "pickup";

    const result = await createOrder({
      customerName: `${shipping.firstName.trim()} ${shipping.lastName.trim()}`.trim(),
      customerEmail: form.email.trim(),
      customerPhone: shipping.phone.trim(),
      shippingFirstName: shipping.firstName.trim(),
      shippingLastName: shipping.lastName.trim(),
      shippingStreet: isPickup ? shippingSettings.pickupAddress : shipping.street.trim(),
      shippingCity: isPickup ? shippingSettings.pickupName : shipping.city.trim(),
      shippingDistrict: isPickup ? "Colombo" : shipping.district,
      shippingPostalCode:
        shipping.postalCode.trim() === OTHER_COLOMBO_ZONE_VALUE ? null : shipping.postalCode.trim() || null,
      deliveryMethod,
      paymentMethod,
      paymentReference: form.paymentReference.trim() || null,
      slipPath,
      couponCode: appliedCoupon?.code ?? null,
      notes: form.notes.trim() || null,
      sourceAddressId: resolvedAddress.sourceAddressId,
      idempotencyKey,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        attributeSelections: item.attributeSelections,
      })),
      clientTotal: total,
      clientShippingFee: shippingFee,
    });

    if (result.error || !result.orderId || !result.orderNumber) {
      setPending(false);
      setSubmitError(result.error ?? "Could not place order.");
      return;
    }

    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);

    // The order is confirmed created from this point on — nothing below
    // (cart-clearing, PayHere setup, navigation itself) may ever hide
    // that fact from the customer. This renders immediately and stays on
    // screen even if the redirect below silently fails.
    setPlacedOrder({ orderNumber: result.orderNumber, orderId: result.orderId });

    if (paymentMethod === "payhere") {
      const checkout = await getPayHereCheckoutParams(result.orderId);
      setPending(false);

      if (checkout.error || !checkout.params || !checkout.checkoutUrl) {
        setSubmitError(checkout.error ?? "Could not start card payment.");
        return;
      }

      await clear().catch(() => {});
      setPayHereRedirect({ checkoutUrl: checkout.checkoutUrl, params: checkout.params });
      return;
    }

    setPending(false);
    await clear().catch(() => {});
    try {
      router.replace(confirmationUrl(result.orderNumber, result.orderId, isLoggedIn));
    } catch {
      // placedOrder (rendered below) already shows the order number and a
      // manual link to the same URL — the customer is never stranded.
    }
  }

  if (payHereRedirect) {
    return (
      <PayHereRedirectForm checkoutUrl={payHereRedirect.checkoutUrl} params={payHereRedirect.params} />
    );
  }

  if (placedOrder) {
    const url = confirmationUrl(placedOrder.orderNumber, placedOrder.orderId, isLoggedIn);
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Order placed</h1>
        <p className="mt-2 text-[var(--muted)]">
          Order <strong>{placedOrder.orderNumber}</strong> has been received.
        </p>
        {submitError ? (
          <div className="mt-4 flex flex-col gap-2">
            <p role="alert" className="text-sm text-[var(--color-discount)]">
              {submitError}
            </p>
            <a
              href={getWhatsAppUrl("Hi, I'm having trouble finishing my card payment on trendymall.online")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm underline"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              Message us on WhatsApp
            </a>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">Taking you to your confirmation page…</p>
        )}
        <Link href={url} className="mt-6 inline-flex min-h-11 items-center underline">
          View order confirmation
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] flex-1 px-6 py-8 max-sm:py-6 max-sm:pb-28">
      <CheckoutSteps />
      <div className="mt-3">
        <h1 className="font-heading text-[28px] font-semibold tracking-tight sm:text-[32px]">Checkout</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)] sm:text-sm">Complete your order securely.</p>
      </div>

      <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_400px] lg:gap-9">
        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-6"
        >
          <section>
            <h2 className="text-sm font-semibold">Contact</h2>
            <div className="mt-3">
              <Field
                id="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => setField("email", v)}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    email: !form.email.trim()
                      ? "Required."
                      : form.email.includes("@")
                        ? undefined
                        : "Enter a valid email.",
                  }))
                }
                error={errors.email}
                required
              />
              {!errors.email && form.email.trim() && form.email.includes("@") && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--muted)]">
                  <CheckIcon className="h-3 w-3 text-emerald-600" />
                  We&apos;ll send your order confirmation here.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold">Delivery</h2>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMethod("standard")}
                aria-pressed={deliveryMethod === "standard"}
                className={`transition-brand flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-input)] border p-3 text-left text-sm ${
                  deliveryMethod === "standard"
                    ? "border-[1.5px] border-[var(--color-accent)] bg-[var(--color-accent)]/[0.06]"
                    : "border-[var(--border)] hover:border-[var(--border-hover)]"
                }`}
              >
                <TruckIcon className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                <span className="flex-1">
                  <span className="block font-medium">Standard delivery</span>
                  <span className="block text-xs text-[var(--muted)]">Delivered to your address</span>
                </span>
                {deliveryMethod === "standard" && (
                  <CheckIcon className="h-4 w-4 shrink-0 text-[var(--foreground)]" />
                )}
              </button>
              {shippingSettings.pickupEnabled && (
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("pickup")}
                  aria-pressed={deliveryMethod === "pickup"}
                  className={`transition-brand flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-input)] border p-3 text-left text-sm ${
                    deliveryMethod === "pickup"
                      ? "border-[1.5px] border-[var(--color-accent)] bg-[var(--color-accent)]/[0.06]"
                      : "border-[var(--border)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  <StoreIcon className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                  <span className="flex-1">
                    <span className="block font-medium">Store Pickup — Free</span>
                    <span className="block text-xs text-[var(--muted)]">Pick up in person</span>
                  </span>
                  {deliveryMethod === "pickup" && (
                    <CheckIcon className="h-4 w-4 shrink-0 text-[var(--foreground)]" />
                  )}
                </button>
              )}
            </div>

            {deliveryMethod === "pickup" && shippingSettings.pickupEnabled && (
              <div className="mt-3 rounded-[var(--radius-input)] border border-[var(--border)] bg-black/5 px-3 py-3 text-sm text-[var(--muted)]">
                <p className="font-medium text-[var(--foreground)]">{shippingSettings.pickupName}</p>
                <p className="mt-1">{shippingSettings.pickupAddress}</p>
                <p>{shippingSettings.pickupHours}</p>
                {shippingSettings.pickupInstructions && <p className="mt-1">{shippingSettings.pickupInstructions}</p>}
              </div>
            )}

            <div className="mt-3">
              <CheckoutAddress
                ref={addressRef}
                addresses={addresses}
                onFieldsChange={setAddressFields}
                requireFullAddress={deliveryMethod === "standard"}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold">Payment method</h2>
            <div className="mt-3 flex flex-col gap-3">
              <PaymentMethodCard
                icon={CashIcon}
                title="Cash on Delivery"
                description="Pay in cash when your order arrives"
                selected={paymentMethod === "cod"}
                disabled={!codEnabled}
                comingSoon={!codEnabled}
                onSelect={() => setPaymentMethod("cod")}
              />
              <PaymentMethodCard
                icon={BankIcon}
                title="Bank Transfer"
                description="Transfer to our account, then upload your slip"
                selected={paymentMethod === "bank_transfer"}
                disabled={!bankTransferEnabled}
                comingSoon={!bankTransferEnabled}
                onSelect={() => setPaymentMethod("bank_transfer")}
              />
              <PaymentMethodCard
                icon={CreditCardIcon}
                title="Card Payment"
                description="Visa · Mastercard · American Express — via PayHere"
                selected={paymentMethod === "payhere"}
                disabled={!payHereEnabled}
                comingSoon={!payHereEnabled}
                onSelect={() => setPaymentMethod("payhere")}
              />
            </div>

            {paymentMethod === "bank_transfer" && (
              <div className="mt-3 flex flex-col gap-3">
                {bankDetails && (
                  <div className="rounded-[var(--radius-input)] border border-[var(--border)] bg-black/5 px-3 py-3 text-sm">
                    <p className="font-medium text-[var(--foreground)]">Transfer to</p>
                    <p className="mt-1 text-[var(--muted)]">{bankDetails.bank_name}</p>
                    <p className="text-[var(--muted)]">{bankDetails.account_name}</p>
                    <p className="text-[var(--muted)]">{bankDetails.account_number}</p>
                    <p className="text-[var(--muted)]">{bankDetails.branch}</p>
                    {bankDetails.instructions && (
                      <p className="mt-2 text-[var(--muted)]">{bankDetails.instructions}</p>
                    )}
                  </div>
                )}

                <Field
                  id="paymentReference"
                  label="Bank reference number (optional if uploading a slip)"
                  value={form.paymentReference}
                  onChange={(v) => setField("paymentReference", v)}
                />

                <div className="flex flex-col gap-1">
                  <label htmlFor="slip" className="text-sm font-medium">
                    Upload bank slip (optional if entering a reference number)
                  </label>
                  <input
                    ref={fileInputRef}
                    id="slip"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleSlipChange}
                    disabled={slipUploading}
                    className="text-sm"
                  />
                  {slipUploading && <p className="text-xs text-[var(--muted)]">Uploading…</p>}
                  {slipFileName && !slipUploading && (
                    <p className="text-xs text-[var(--muted)]">Attached: {slipFileName}</p>
                  )}
                  {slipError && <FieldError message={slipError} />}
                </div>

                {paymentError && <FieldError message={paymentError} />}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold">Order notes</h2>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Optional"
              className="mt-3 w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
            />
          </section>

          <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <LockIcon className="h-3.5 w-3.5" /> Secure checkout
            </span>
            <span className="flex items-center gap-1">
              <CheckIcon className="h-3.5 w-3.5" /> Your information is protected
            </span>
          </div>

          {submitError && (
            <div role="alert" className="flex flex-col gap-1">
              <p className="text-sm text-[var(--color-discount)]">{submitError}</p>
              <a
                href={getWhatsAppUrl("Hi, I'm having trouble placing an order on trendymall.online")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm underline"
              >
                <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                Message us on WhatsApp
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || slipUploading || items.length === 0 || !hydrated}
            className="transition-brand hidden w-full items-center justify-center rounded-[12px] bg-[var(--foreground)] px-6 py-4 text-[15px] font-semibold text-white hover:bg-[var(--color-btn-hover)] disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
          >
            {pending ? "Placing order…" : `Place order • ${formatPrice(total)}`}
          </button>
        </form>

        <div className="h-fit rounded-[16px] border border-[var(--border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card-hover)] lg:sticky lg:top-[90px]">
          <h2 className="text-lg font-medium">Order summary</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={`${item.productId}:${item.variantId ?? "base"}`}
                className="flex items-start gap-3 text-sm"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[8px] border border-[var(--border)] bg-black/5">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                  )}
                </div>
                <div className="flex flex-1 items-start justify-between gap-2">
                  <span className="line-clamp-2 flex-1">
                    {item.name}
                    {item.variantName ? ` (${item.variantName})` : ""} × {item.quantity}
                  </span>
                  <span className="shrink-0 font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {couponAutoApplying ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border)] bg-black/5 px-3 py-2 text-sm text-[var(--muted)]">
                Applying your saved coupon…
              </div>
            ) : appliedCoupon ? (
              <div className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--color-accent)]/[0.06] px-3 py-2.5 text-sm">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                  <strong>{appliedCoupon.code}</strong> applied — {appliedCoupon.label}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium hover:bg-black/5"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Coupon code"
                    className="flex-1 rounded-[var(--radius-input)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponChecking || !couponInput.trim()}
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50"
                  >
                    {couponChecking ? "Checking…" : "Apply"}
                  </button>
                </div>
                {couponError && <FieldError message={couponError} />}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                Delivery
                {deliveryMethod === "standard" && addressFields.district.trim() && (
                  <span className="block text-xs text-[var(--muted)]">
                    {deliveryReason.startsWith("Colombo") ? `Delivery to ${deliveryReason}` : deliveryReason} —{" "}
                    {campaignShippingWaiver > 0 ? "Free (Promotion)" : formatPrice(shippingFee)}
                  </span>
                )}
              </span>
              <span>
                {deliveryMethod === "pickup" || campaignShippingWaiver > 0 ? "Free" : formatPrice(shippingFee)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[var(--color-discount)]">
                <span>Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="text-base font-semibold">Total</span>
              <span className="text-[21px] font-bold">{formatPrice(total)}</span>
            </div>
            {deliveryMethod !== "pickup" && (
              <div className="mt-1 rounded-[var(--radius-input)] bg-black/5 px-3 py-2 text-xs text-[var(--muted)]">
                Estimated delivery: {getEstimatedDeliveryRange().label.replace(/^Get it by /, "")}
              </div>
            )}
          </div>

          <ul className="mt-4 flex flex-col gap-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
            <li className="flex items-center gap-1.5">
              <CheckIcon className="h-3 w-3" /> Secure checkout
            </li>
            <li className="flex items-center gap-1.5">
              <CheckIcon className="h-3 w-3" /> Cash on Delivery available
            </li>
            <li className="flex items-center gap-1.5">
              <CheckIcon className="h-3 w-3" /> Easy order tracking
            </li>
          </ul>
        </div>
      </div>

      <div
        ref={stickyBarRef}
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky-bar)] flex items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--color-card)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-card-hover)] lg:hidden"
      >
        <div className="flex flex-col">
          <span className="text-xs text-[var(--muted)]">Total</span>
          <span className="text-lg font-bold">{formatPrice(total)}</span>
        </div>
        <button
          type="submit"
          form="checkout-form"
          disabled={pending || slipUploading || items.length === 0}
          className="transition-brand flex h-[52px] items-center justify-center rounded-[12px] bg-[var(--foreground)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-btn-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Placing…" : "Place Order"}
        </button>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-[var(--radius-input)] border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
          error
            ? "border-red-600 focus:ring-red-600"
            : "border-[var(--border)] focus:ring-[var(--foreground)]"
        }`}
      />
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}
