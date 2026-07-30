"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createOrder, getPayHereCheckoutParams } from "@/lib/orders";
import { previewCoupon } from "@/lib/coupons";
import { uploadPaymentSlip } from "@/lib/uploadPaymentSlip";
import { formatPrice } from "@/lib/utils";
import { getDeliveryFee, isColomboZone } from "@/lib/shipping-rates";
import { PayHereRedirectForm } from "@/components/checkout/PayHereRedirectForm";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { CheckoutAddress } from "@/components/checkout/CheckoutAddress";
import { PaymentMethodCard } from "@/components/checkout/PaymentMethodCard";
import { CashIcon, BankIcon, CreditCardIcon, LockIcon } from "@/components/ui/Icon";
import { FieldError } from "@/components/ui/FieldError";
import type { CheckoutAddressFields, CheckoutAddressHandle } from "@/components/checkout/CheckoutAddress";
import type { BankTransferSettings, CustomerAddress, DeliveryMethod } from "@/types";
import type { PayHereCheckoutParams } from "@/lib/orders";

const PICKUP_ADDRESS = "Salawatta Road, Wellampitiya";
const PICKUP_HOURS = "Daily, 10am – 4pm";
const DRAFT_STORAGE_KEY = "trendymall-checkout-draft";

type PaymentMethod = "cod" | "bank_transfer" | "payhere";

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

export function CheckoutForm({
  bankDetails,
  payHereEnabled,
  addresses,
  preferredPaymentMethod,
  isLoggedIn,
}: {
  bankDetails: BankTransferSettings | null;
  payHereEnabled: boolean;
  addresses: CustomerAddress[];
  // "Remembers last-used method" (Phase 1's Payment Preference field) —
  // never defaults to something currently unselectable (payhere while
  // the feature flag is off).
  preferredPaymentMethod: PaymentMethod | null;
  // Guest checkout (v12 Phase 4) — addresses is always empty for a guest
  // anyway, but this also governs whether CheckoutAddress shows the
  // "save for next time"/edit-scope UI at all.
  isLoggedIn: boolean;
}) {
  const { items, subtotal, clear, couponCode: cartCouponCode, notes: cartNotes } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(() => ({ email: "", notes: cartNotes, paymentReference: "" }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    if (preferredPaymentMethod === "payhere" && !payHereEnabled) return "cod";
    return preferredPaymentMethod ?? "cod";
  });
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [payHereRedirect, setPayHereRedirect] = useState<{
    checkoutUrl: string;
    params: PayHereCheckoutParams;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
  } | null>(null);

  // Pricing keys off the city (a specific Colombo 01-15 postal zone), not
  // the district — the district dropdown is address completeness only.
  const shippingFee = getDeliveryFee(addressFields.city, deliveryMethod);
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal + shippingFee - discount);

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
        if (parsed.deliveryMethod === "standard" || parsed.deliveryMethod === "pickup") {
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
  // (same --mobile-toast-offset handshake as app/cart/page.tsx) so toasts
  // shift up above it instead of being covered.
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
  }, []);

  // A preview only — create_order_atomic re-validates the code and
  // recomputes the real discount from scratch at submit time regardless
  // of what this shows (Rule #1: the server is the only source of truth).
  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponChecking(true);
    setCouponError(null);

    const result = await previewCoupon(couponInput.trim(), subtotal, shippingFee);

    setCouponChecking(false);

    if (result.error || result.discount == null) {
      setCouponError(result.error ?? "Invalid coupon code.");
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon({ code: couponInput.trim(), discount: result.discount, label: result.label ?? "" });
  }

  // Auto-preview a coupon already applied on the cart page, once, on
  // mount — so its discount shows here without an extra click. Submit
  // time still re-validates from scratch regardless (see above).
  useEffect(() => {
    if (cartCouponCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to an external signal (the cart's saved coupon), same class of exception as the localStorage-read effects elsewhere in this app.
      void handleApplyCoupon();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const result = await uploadPaymentSlip(formData);

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

    const resolvedAddress = await addressRef.current!.resolveForSubmit();
    if (resolvedAddress.error) {
      setPending(false);
      setSubmitError(resolvedAddress.error);
      return;
    }
    const shipping = resolvedAddress.fields;

    const result = await createOrder({
      customerName: `${shipping.firstName.trim()} ${shipping.lastName.trim()}`.trim(),
      customerEmail: form.email.trim(),
      customerPhone: shipping.phone.trim(),
      shippingFirstName: shipping.firstName.trim(),
      shippingLastName: shipping.lastName.trim(),
      shippingStreet: shipping.street.trim(),
      shippingCity: shipping.city.trim(),
      shippingDistrict: shipping.district,
      shippingPostalCode: shipping.postalCode.trim() || null,
      deliveryMethod,
      paymentMethod,
      paymentReference: form.paymentReference.trim() || null,
      slipPath,
      couponCode: appliedCoupon?.code ?? null,
      notes: form.notes.trim() || null,
      sourceAddressId: resolvedAddress.sourceAddressId,
      idempotencyKey,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      clientTotal: total,
    });

    if (result.error || !result.orderId) {
      setPending(false);
      setSubmitError(result.error ?? "Could not place order.");
      return;
    }

    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);

    if (paymentMethod === "payhere") {
      const checkout = await getPayHereCheckoutParams(result.orderId);
      setPending(false);

      if (checkout.error || !checkout.params || !checkout.checkoutUrl) {
        setSubmitError(checkout.error ?? "Could not start card payment.");
        return;
      }

      clear();
      setPayHereRedirect({ checkoutUrl: checkout.checkoutUrl, params: checkout.params });
      return;
    }

    setPending(false);
    clear();
    router.push(`/checkout/success?orderId=${result.orderId}`);
  }

  if (payHereRedirect) {
    return (
      <PayHereRedirectForm checkoutUrl={payHereRedirect.checkoutUrl} params={payHereRedirect.params} />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12 max-sm:pb-28">
      <CheckoutSteps />
      <h1 className="font-heading mt-4 text-3xl font-bold tracking-tight">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-6"
        >
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
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
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold">Delivery</h2>
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-3 text-sm">
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={deliveryMethod === "standard"}
                  onChange={() => setDeliveryMethod("standard")}
                />
                Standard delivery
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-3 text-sm">
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={deliveryMethod === "pickup"}
                  onChange={() => setDeliveryMethod("pickup")}
                />
                Store Pickup — Free
              </label>
            </div>

            {deliveryMethod === "pickup" && (
              <div className="mt-3 rounded-[var(--radius-input)] border border-[var(--border)] bg-black/5 px-3 py-3 text-sm text-[var(--muted)]">
                <p className="font-medium text-[var(--foreground)]">Pickup location</p>
                <p className="mt-1">{PICKUP_ADDRESS}</p>
                <p>{PICKUP_HOURS}</p>
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
                onSelect={() => setPaymentMethod("cod")}
              />
              <PaymentMethodCard
                icon={BankIcon}
                title="Bank Transfer"
                description="Transfer to our account, then upload your slip"
                selected={paymentMethod === "bank_transfer"}
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

            <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <LockIcon className="h-3.5 w-3.5" /> SSL Protected
              </span>
              <span className="flex items-center gap-1">
                <LockIcon className="h-3.5 w-3.5" /> 256-bit Encryption
              </span>
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

          {submitError && (
            <p role="alert" className="text-sm text-[var(--color-discount)]">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || slipUploading || items.length === 0 || !hydrated}
            className="transition-brand hidden w-full items-center justify-center rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
          >
            {pending ? "Placing order…" : `Place order — ${formatPrice(total)}`}
          </button>
        </form>

        <div className="h-fit rounded-[20px] border border-[var(--border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          <h2 className="text-lg font-medium">Order summary</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between text-sm">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] bg-black/5 px-3 py-2 text-sm">
                <span>
                  Coupon <strong>{appliedCoupon.code}</strong> — {appliedCoupon.label}
                </span>
                <button type="button" onClick={handleRemoveCoupon} className="text-xs underline">
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
                    onClick={handleApplyCoupon}
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
                {deliveryMethod === "standard" && addressFields.city.trim() && (
                  <span className="block text-xs text-[var(--muted)]">
                    {addressFields.city.trim()} — {isColomboZone(addressFields.city) ? "Colombo zone rate" : "standard rate"}
                  </span>
                )}
              </span>
              <span>{deliveryMethod === "pickup" ? "Free" : formatPrice(shippingFee)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[var(--color-discount)]">
                <span>Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={stickyBarRef}
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky-bar)] flex items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card-hover)] lg:hidden"
      >
        <div className="flex flex-col">
          <span className="text-xs text-[var(--muted)]">Total</span>
          <span className="text-base font-medium">{formatPrice(total)}</span>
        </div>
        <button
          type="submit"
          form="checkout-form"
          disabled={pending || slipUploading || items.length === 0}
          className="transition-brand rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:cursor-not-allowed disabled:opacity-50"
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
