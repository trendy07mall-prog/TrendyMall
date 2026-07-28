"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@/lib/orders";
import { uploadPaymentSlip } from "@/lib/uploadPaymentSlip";
import { formatPrice, isValidSriLankanPhone } from "@/lib/utils";
import type { BankTransferSettings, DeliveryMethod } from "@/types";

const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
] as const;

// Mirrors the server-side fee logic in sql/022's create_order_atomic — a
// client-side preview only. The RPC recomputes this itself and is the
// only number that's actually charged.
const WESTERN_PROVINCE_DISTRICTS = new Set(["Colombo", "Gampaha", "Kalutara"]);

const PICKUP_ADDRESS = "Salawatta Road, Wellampitiya";
const PICKUP_HOURS = "Daily, 10am – 4pm";

type PaymentMethod = "cod" | "bank_transfer";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  postalCode: string;
  notes: string;
  paymentReference: string;
}

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  district: "",
  postalCode: "",
  notes: "",
  paymentReference: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validateField(
  field: keyof FormState,
  form: FormState,
  deliveryMethod: DeliveryMethod,
): string | undefined {
  const value = form[field].trim();
  const requiresAddress = deliveryMethod === "standard";

  switch (field) {
    case "firstName":
    case "lastName":
      return value ? undefined : "Required.";
    case "email":
      if (!value) return "Required.";
      return value.includes("@") ? undefined : "Enter a valid email.";
    case "phone":
      if (!value) return "Required.";
      return isValidSriLankanPhone(value) ? undefined : "Enter a valid Sri Lankan number.";
    case "street":
    case "city":
      if (!requiresAddress) return undefined;
      return value ? undefined : "Required.";
    case "district":
      if (!requiresAddress) return undefined;
      return value ? undefined : "Select a district.";
    default:
      return undefined;
  }
}

export function CheckoutForm({ bankDetails }: { bankDetails: BankTransferSettings | null }) {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [slipPath, setSlipPath] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shippingFee =
    deliveryMethod === "pickup"
      ? 0
      : WESTERN_PROVINCE_DISTRICTS.has(form.district)
        ? 255
        : 400;
  const total = subtotal + shippingFee;

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof FormState) {
    setErrors((prev) => ({ ...prev, [field]: validateField(field, form, deliveryMethod) }));
  }

  function validateAll(): boolean {
    const fields: (keyof FormState)[] = [
      "firstName", "lastName", "email", "phone", "street", "city", "district",
    ];
    const next: FieldErrors = {};
    for (const field of fields) {
      const fieldError = validateField(field, form, deliveryMethod);
      if (fieldError) next[field] = fieldError;
    }
    setErrors(next);

    let paymentValid = true;
    if (paymentMethod === "bank_transfer" && !form.paymentReference.trim() && !slipPath) {
      setPaymentError("Provide a bank slip or a reference number.");
      paymentValid = false;
    } else {
      setPaymentError(null);
    }

    return Object.keys(next).length === 0 && paymentValid;
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

    const result = await createOrder({
      customerName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      customerEmail: form.email.trim(),
      customerPhone: form.phone.trim(),
      shippingFirstName: form.firstName.trim(),
      shippingLastName: form.lastName.trim(),
      shippingStreet: form.street.trim(),
      shippingCity: form.city.trim(),
      shippingDistrict: form.district,
      shippingPostalCode: form.postalCode.trim() || null,
      deliveryMethod,
      paymentMethod,
      paymentReference: form.paymentReference.trim() || null,
      slipPath,
      notes: form.notes.trim() || null,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      clientTotal: total,
    });

    setPending(false);

    if (result.error || !result.orderId) {
      setSubmitError(result.error ?? "Could not place order.");
      return;
    }

    clear();
    router.push(`/checkout/success?orderId=${result.orderId}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl flex-1 gap-10 px-6 py-12 sm:grid-cols-2">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Checkout</h1>
        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="firstName"
              label="First name"
              value={form.firstName}
              onChange={(v) => setField("firstName", v)}
              onBlur={() => handleBlur("firstName")}
              error={errors.firstName}
              required
            />
            <Field
              id="lastName"
              label="Last name"
              value={form.lastName}
              onChange={(v) => setField("lastName", v)}
              onBlur={() => handleBlur("lastName")}
              error={errors.lastName}
              required
            />
          </div>
          <Field
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setField("email", v)}
            onBlur={() => handleBlur("email")}
            error={errors.email}
            required
          />
          <Field
            id="phone"
            label="Phone"
            type="tel"
            placeholder="07XXXXXXXX"
            value={form.phone}
            onChange={(v) => setField("phone", v)}
            onBlur={() => handleBlur("phone")}
            error={errors.phone}
            required
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Delivery method</span>
            <label className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm">
              <input
                type="radio"
                name="deliveryMethod"
                checked={deliveryMethod === "standard"}
                onChange={() => setDeliveryMethod("standard")}
              />
              Standard delivery
            </label>
            <label className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm">
              <input
                type="radio"
                name="deliveryMethod"
                checked={deliveryMethod === "pickup"}
                onChange={() => setDeliveryMethod("pickup")}
              />
              Store Pickup — Free
            </label>
          </div>

          {deliveryMethod === "pickup" ? (
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-black/5 px-3 py-3 text-sm text-[var(--muted)]">
              <p className="font-medium text-[var(--foreground)]">Pickup location</p>
              <p className="mt-1">{PICKUP_ADDRESS}</p>
              <p>{PICKUP_HOURS}</p>
            </div>
          ) : (
            <>
              <Field
                id="street"
                label="Street address"
                value={form.street}
                onChange={(v) => setField("street", v)}
                onBlur={() => handleBlur("street")}
                error={errors.street}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Field
                  id="city"
                  label="City"
                  value={form.city}
                  onChange={(v) => setField("city", v)}
                  onBlur={() => handleBlur("city")}
                  error={errors.city}
                  required
                />
                <div className="flex flex-col gap-1">
                  <label htmlFor="district" className="text-sm font-medium">
                    District
                  </label>
                  <select
                    id="district"
                    value={form.district}
                    onChange={(e) => setField("district", e.target.value)}
                    onBlur={() => handleBlur("district")}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                  >
                    <option value="">Select…</option>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {errors.district && <p className="text-xs text-red-600">{errors.district}</p>}
                </div>
              </div>
              <Field
                id="postalCode"
                label="Postal code (optional)"
                value={form.postalCode}
                onChange={(v) => setField("postalCode", v)}
              />
            </>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium">
              Order notes (optional)
            </label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Payment method</span>
            <label className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              Cash on Delivery
            </label>
            <label className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm">
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "bank_transfer"}
                onChange={() => setPaymentMethod("bank_transfer")}
              />
              Bank Transfer
            </label>
          </div>

          {paymentMethod === "bank_transfer" && (
            <div className="flex flex-col gap-3">
              {bankDetails && (
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-black/5 px-3 py-3 text-sm">
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
                {slipError && <p className="text-xs text-red-600">{slipError}</p>}
              </div>

              {paymentError && <p className="text-xs text-red-600">{paymentError}</p>}
            </div>
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            type="submit"
            disabled={pending || slipUploading || items.length === 0}
            className="mt-2 rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {pending ? "Placing order…" : `Place order — ${formatPrice(total)}`}
          </button>
        </form>
      </div>

      <div>
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
        <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{deliveryMethod === "pickup" ? "Free" : formatPrice(shippingFee)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
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
        className={`rounded-[var(--radius-sm)] border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
          error
            ? "border-red-600 focus:ring-red-600"
            : "border-[var(--border)] focus:ring-[var(--foreground)]"
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
