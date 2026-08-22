"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { saveAddress } from "@/lib/addresses";
import { isValidSriLankanPhone } from "@/lib/utils";
import { SRI_LANKAN_CITIES } from "@/lib/cities";
import { SRI_LANKAN_DISTRICTS } from "@/lib/districts";
import { COLOMBO_ZONE_POSTAL_CODES, normalizePostalCode } from "@/lib/delivery-fee";
import { FieldError } from "@/components/ui/FieldError";
import { RequiredMark } from "@/components/ui/RequiredMark";
import type { CustomerAddress } from "@/types";

// Sentinel stored in fields.postalCode when the customer explicitly picks
// "Other" from the Colombo-zone dropdown — distinguishes "deliberately not
// a specific zone" (valid, prices at the outside-zone rate) from "hasn't
// chosen yet" (empty string, invalid). Converted back to a real value
// before it reaches the server (CheckoutForm.tsx's handleSubmit).
export const OTHER_COLOMBO_ZONE_VALUE = "OTHER";

export interface CheckoutAddressFields {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  postalCode: string;
}

const EMPTY_FIELDS: CheckoutAddressFields = {
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  city: "",
  district: "",
  postalCode: "",
};

function fieldsFromAddress(address: CustomerAddress): CheckoutAddressFields {
  const rawPostalCode = address.postal_code ?? "";
  // A saved address's postal_code may predate this normalization (a bare
  // "12", a synonym, or genuinely nothing) — resolve it to the dropdown's
  // canonical value so the right zone is preselected, falling back to the
  // explicit "Other" choice (never a raw, unmatched value the <select>
  // can't represent) when it doesn't resolve to a known 1-15 zone.
  const postalCode =
    address.district === "Colombo"
      ? (normalizePostalCode(rawPostalCode) ?? (rawPostalCode ? OTHER_COLOMBO_ZONE_VALUE : ""))
      : rawPostalCode;
  return {
    firstName: address.first_name,
    lastName: address.last_name,
    phone: address.phone,
    street: address.street,
    city: address.city,
    district: address.district,
    postalCode,
  };
}

// "Other" and unresolved dropdown states never look right printed next to
// an address (e.g. "...Colombo OTHER") — anything other than a genuine
// value collapses to nothing.
function displayPostalCode(fields: CheckoutAddressFields): string {
  return fields.postalCode === OTHER_COLOMBO_ZONE_VALUE ? "" : fields.postalCode;
}

type Mode = "card" | "picker" | "form";
export type FieldErrors = Partial<Record<keyof CheckoutAddressFields, string>>;

function validateAddressFields(
  fields: CheckoutAddressFields,
  requireFullAddress: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.firstName.trim()) errors.firstName = "Please enter your first name.";
  if (!fields.lastName.trim()) errors.lastName = "Please enter your last name.";
  if (!fields.phone.trim()) {
    errors.phone = "Please enter your phone number.";
  } else if (!isValidSriLankanPhone(fields.phone)) {
    errors.phone = "Please enter a valid Sri Lankan phone number.";
  }
  // Street/City/District/Postal code are only ever required (and only
  // ever rendered at all) for Standard Delivery — Store Pickup collects
  // just a name and phone, per requireFullAddress's own doc comment below.
  if (requireFullAddress) {
    if (!fields.street.trim()) errors.street = "Please enter your street address.";
    if (!fields.city.trim()) errors.city = "Please enter your city.";
    if (!fields.district.trim()) errors.district = "Please select your district.";
    if (!fields.postalCode.trim()) {
      errors.postalCode =
        fields.district === "Colombo" ? "Please select your delivery zone." : "Please enter your postal code.";
    } else if (fields.district !== "Colombo" && !/^\d{3,5}$/.test(fields.postalCode.trim())) {
      errors.postalCode = "Please enter a valid postal code.";
    }
  }
  return errors;
}

function validateOneField(
  field: keyof CheckoutAddressFields,
  fields: CheckoutAddressFields,
  requireFullAddress: boolean,
): string | undefined {
  return validateAddressFields(fields, requireFullAddress)[field];
}

export interface CheckoutAddressHandle {
  // Resolves what sourceAddressId createOrder should use, performing
  // whatever lib/addresses.ts saveAddress call is needed first (a new
  // address when "save for next time" is checked, an update when "also
  // update my saved address" was chosen on Edit) — a single async call
  // the parent makes once, at final submit time, not on every keystroke.
  resolveForSubmit(): Promise<{ fields: CheckoutAddressFields; sourceAddressId: string | null; error?: string }>;
  // Synchronous, no saveAddress/network side effects — lets the parent
  // validate every required field (email included) on ONE submit attempt,
  // instead of only ever reaching address validation after email already
  // passed. Sets this component's own error state and switches to "form"
  // mode if a saved address (in "card" mode, no inputs on screen at all)
  // turns out to have a now-invalid field, then returns the errors so the
  // parent can find the first invalid field across the WHOLE form, in DOM
  // order, to focus/scroll to.
  validateFields(): FieldErrors;
}

export const CheckoutAddress = forwardRef<
  CheckoutAddressHandle,
  {
    addresses: CustomerAddress[];
    onFieldsChange: (fields: CheckoutAddressFields) => void;
    // false for Store Pickup — a full shipping address isn't needed, only
    // a name and phone to hand off the order in-store (street/city/
    // district stay hidden and unvalidated, matching the original
    // pre-redesign checkout's requiresAddress gating).
    requireFullAddress: boolean;
    // false for guest checkout (v12 Phase 4) — a guest has no address
    // book to save into, so "Save this information..."/the edit-scope
    // choice never render, and resolveForSubmit never calls saveAddress
    // regardless of state (addresses is always empty for a guest anyway,
    // so selectedAddressId/editScope paths are already unreachable — this
    // only guards the "brand-new address" save-for-next-time path).
    isLoggedIn: boolean;
  }
>(function CheckoutAddress({ addresses, onFieldsChange, requireFullAddress, isLoggedIn }, ref) {
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  const [mode, setMode] = useState<Mode>(defaultAddress ? "card" : "form");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [fields, setFields] = useState<CheckoutAddressFields>(
    defaultAddress ? fieldsFromAddress(defaultAddress) : EMPTY_FIELDS,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [editScope, setEditScope] = useState<"order-only" | "update-saved">("order-only");
  const [saveForNextTime, setSaveForNextTime] = useState(true);

  useEffect(() => {
    onFieldsChange(fields);
    // Only re-report when the fields themselves change — onFieldsChange
    // is a fresh function identity each parent render otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  useImperativeHandle(ref, () => ({
    async resolveForSubmit() {
      const fieldErrors = validateAddressFields(fields, requireFullAddress);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setMode("form");
        return { fields, sourceAddressId: null, error: "Check your shipping address." };
      }

      // Store Pickup: just a name + phone to hand the order off with, not
      // a real shipping address — never touches the address book
      // (lib/addresses.ts's saveAddress requires street/city, which
      // pickup deliberately never collects).
      if (!requireFullAddress) {
        return { fields, sourceAddressId: null };
      }

      // Card mode, address unedited from what's saved — reuse its id
      // directly, no write needed.
      if (mode === "card" && selectedAddressId) {
        return { fields, sourceAddressId: selectedAddressId };
      }

      // Editing an existing saved address — only touch the saved row if
      // the customer explicitly chose to (default is "order-only", per
      // the spec's "don't silently overwrite their default" warning).
      if (selectedAddressId && editScope === "update-saved") {
        const formData = buildFormData(fields, selectedAddressId);
        const result = await saveAddress(undefined, formData);
        if (result?.error) return { fields, sourceAddressId: null, error: result.error };
        return { fields, sourceAddressId: selectedAddressId };
      }
      if (selectedAddressId && editScope === "order-only") {
        return { fields, sourceAddressId: null };
      }

      // A brand-new address.
      if (isLoggedIn && saveForNextTime) {
        const formData = buildFormData(fields, null);
        const result = await saveAddress(undefined, formData);
        if (result?.error) return { fields, sourceAddressId: null, error: result.error };
        return { fields, sourceAddressId: result?.id ?? null };
      }

      return { fields, sourceAddressId: null };
    },
    validateFields() {
      const fieldErrors = validateAddressFields(fields, requireFullAddress);
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length > 0) setMode("form");
      return fieldErrors;
    },
  }));

  // Blur-validates the first time (doesn't nag mid-first-attempt), then
  // live-validates on every keystroke once an error has actually been
  // shown for that field — the customer sees it clear the moment their
  // correction is valid, not only after tabbing away again.
  function updateField(field: keyof CheckoutAddressFields, value: string) {
    const nextFields = { ...fields, [field]: value };
    setFields(nextFields);
    setErrors((prev) =>
      prev[field] ? { ...prev, [field]: validateOneField(field, nextFields, requireFullAddress) } : prev,
    );
  }

  function handleBlur(field: keyof CheckoutAddressFields) {
    setErrors((prev) => ({ ...prev, [field]: validateOneField(field, fields, requireFullAddress) }));
  }

  function handleUseThisAddress() {
    const fieldErrors = validateAddressFields(fields, requireFullAddress);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length === 0) setMode("card");
  }

  function selectAddress(address: CustomerAddress) {
    setSelectedAddressId(address.id);
    setFields(fieldsFromAddress(address));
    setMode("card");
  }

  function startAddNew() {
    setSelectedAddressId(null);
    setFields(EMPTY_FIELDS);
    setErrors({});
    setSaveForNextTime(true);
    setMode("form");
  }

  function startEdit() {
    setEditScope("order-only");
    setErrors({});
    setMode("form");
  }

  if (mode === "picker") {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
        <p className="text-sm font-medium">Choose a delivery address</p>
        <ul className="mt-3 flex flex-col gap-2">
          {addresses.map((address) => (
            <li key={address.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-input)] border border-[var(--border)] p-3 text-sm hover:bg-black/5">
                <input
                  type="radio"
                  name="checkout-address-picker"
                  checked={selectedAddressId === address.id}
                  onChange={() => selectAddress(address)}
                  className="mt-1"
                />
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    {address.address_label || "Address"}
                    {address.is_default && (
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
                        Default
                      </span>
                    )}
                  </span>
                  <span className="block text-[var(--muted)]">
                    {address.first_name} {address.last_name}, {address.street}, {address.city}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={startAddNew}
          className="mt-3 inline-flex min-h-11 items-center text-sm underline"
        >
          + Add New Address
        </button>
      </div>
    );
  }

  if (mode === "form") {
    const isEditingExisting = Boolean(selectedAddressId);
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
        {isEditingExisting ? (
          <div className="mb-4 flex flex-col gap-2 text-sm">
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="edit-scope"
                checked={editScope === "order-only"}
                onChange={() => setEditScope("order-only")}
              />
              Update just this order
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="edit-scope"
                checked={editScope === "update-saved"}
                onChange={() => setEditScope("update-saved")}
              />
              Also update my saved address
            </label>
          </div>
        ) : isLoggedIn ? (
          <label className="mb-4 flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={saveForNextTime}
              onChange={(e) => setSaveForNextTime(e.target.checked)}
            />
            Save this information for faster checkout next time
          </label>
        ) : (
          <p className="mb-4 text-xs text-[var(--muted)]">
            Create an account after checkout to save this address for next time.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <AddrField
            id="checkout-firstName"
            label="First name"
            value={fields.firstName}
            onChange={(v) => updateField("firstName", v)}
            onBlur={() => handleBlur("firstName")}
            error={errors.firstName}
            required
          />
          <AddrField
            id="checkout-lastName"
            label="Last name"
            value={fields.lastName}
            onChange={(v) => updateField("lastName", v)}
            onBlur={() => handleBlur("lastName")}
            error={errors.lastName}
            required
          />
        </div>
        <div className="mt-4">
          <AddrField
            id="checkout-addr-phone"
            label="Phone"
            type="tel"
            placeholder="07XXXXXXXX"
            value={fields.phone}
            onChange={(v) => updateField("phone", v)}
            onBlur={() => handleBlur("phone")}
            error={errors.phone}
            required
          />
        </div>
        {requireFullAddress && (
          <>
            <div className="mt-4">
              <AddrField
                id="checkout-street"
                label="Street address"
                value={fields.street}
                onChange={(v) => updateField("street", v)}
                onBlur={() => handleBlur("street")}
                error={errors.street}
                required
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="checkout-city" className="text-sm font-medium">
                  City
                  <RequiredMark />
                </label>
                <input
                  id="checkout-city"
                  type="text"
                  list="checkout-city-options"
                  autoComplete="off"
                  required
                  value={fields.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  onBlur={() => handleBlur("city")}
                  aria-invalid={Boolean(errors.city)}
                  aria-describedby={errors.city ? "checkout-city-error" : undefined}
                  className={inputClass(Boolean(errors.city))}
                />
                <datalist id="checkout-city-options">
                  {SRI_LANKAN_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                {errors.city && <FieldError id="checkout-city-error" message={errors.city} />}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="checkout-district" className="text-sm font-medium">
                  District
                  <RequiredMark />
                </label>
                <select
                  id="checkout-district"
                  value={fields.district}
                  onChange={(e) => {
                    // Postal code entry mode differs between Colombo (a
                    // dropdown of canonical codes/"Other") and every other
                    // district (free text) — a value from one mode is
                    // meaningless (or literally the "Other" sentinel) in
                    // the other, so switching resets it. Only the district
                    // error (if shown) is live-revalidated here, same as
                    // updateField — postalCode's error state is left alone
                    // rather than immediately flagging the reset-to-empty
                    // value the customer hasn't even looked at yet.
                    const nextFields = { ...fields, district: e.target.value, postalCode: "" };
                    setFields(nextFields);
                    setErrors((prev) =>
                      prev.district
                        ? { ...prev, district: validateOneField("district", nextFields, requireFullAddress) }
                        : prev,
                    );
                  }}
                  onBlur={() => handleBlur("district")}
                  required
                  aria-invalid={Boolean(errors.district)}
                  aria-describedby={errors.district ? "checkout-district-error" : undefined}
                  className={inputClass(Boolean(errors.district))}
                >
                  <option value="">Select…</option>
                  {SRI_LANKAN_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.district && <FieldError id="checkout-district-error" message={errors.district} />}
              </div>
            </div>
            <div className="mt-4">
              {fields.district === "Colombo" ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor="checkout-postalCode" className="text-sm font-medium">
                    Colombo zone
                    <RequiredMark />
                  </label>
                  <select
                    id="checkout-postalCode"
                    value={fields.postalCode}
                    onChange={(e) => updateField("postalCode", e.target.value)}
                    onBlur={() => handleBlur("postalCode")}
                    required
                    aria-invalid={Boolean(errors.postalCode)}
                    aria-describedby={errors.postalCode ? "checkout-postalCode-error" : undefined}
                    className={inputClass(Boolean(errors.postalCode))}
                  >
                    <option value="">Select…</option>
                    {COLOMBO_ZONE_POSTAL_CODES.map((z) => (
                      <option key={z.code} value={z.code}>
                        {z.label}
                      </option>
                    ))}
                    <option value={OTHER_COLOMBO_ZONE_VALUE}>Other (outside Colombo city)</option>
                  </select>
                  {errors.postalCode && (
                    <FieldError id="checkout-postalCode-error" message={errors.postalCode} />
                  )}
                </div>
              ) : (
                <AddrField
                  id="checkout-postalCode"
                  label="Postal code"
                  value={fields.postalCode}
                  onChange={(v) => updateField("postalCode", v)}
                  onBlur={() => handleBlur("postalCode")}
                  error={errors.postalCode}
                  required
                />
              )}
            </div>
          </>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleUseThisAddress}
            className="transition-brand inline-flex min-h-11 items-center rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
          >
            Use This Address
          </button>
          {addresses.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (selectedAddressId) {
                  const original = addresses.find((a) => a.id === selectedAddressId);
                  if (original) setFields(fieldsFromAddress(original));
                  setErrors({});
                  setMode("card");
                } else {
                  setMode("picker");
                }
              }}
              className="inline-flex min-h-11 items-center text-sm text-[var(--muted)] underline"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card mode
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
          Delivery address
        </span>
        {addresses.length > 1 && (
          <button
            type="button"
            onClick={() => setMode("picker")}
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-3 text-xs font-medium hover:bg-black/5"
          >
            Change
          </button>
        )}
      </div>
      <p className="font-medium">
        {fields.firstName} {fields.lastName}
      </p>
      <p className="mt-1 text-[var(--muted)]">{fields.phone}</p>
      {requireFullAddress && (
        <p className="text-[var(--muted)]">
          {fields.street}, {fields.city}, {fields.district}
          {displayPostalCode(fields) ? ` ${displayPostalCode(fields)}` : ""}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-3 text-xs font-medium hover:bg-black/5"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={startAddNew}
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-3 text-xs font-medium hover:bg-black/5"
        >
          Add New
        </button>
      </div>
    </div>
  );
});

function buildFormData(fields: CheckoutAddressFields, id: string | null): FormData {
  const formData = new FormData();
  if (id) formData.set("id", id);
  formData.set("firstName", fields.firstName);
  formData.set("lastName", fields.lastName);
  formData.set("phone", fields.phone);
  formData.set("street", fields.street);
  formData.set("city", fields.city);
  formData.set("district", fields.district);
  formData.set("postalCode", fields.postalCode);
  return formData;
}

const inputClass = (hasError: boolean) =>
  `rounded-[var(--radius-input)] border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    hasError
      ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
      : "border-[var(--border)] focus:ring-[var(--foreground)]"
  }`;

function AddrField({
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
        {required && <RequiredMark />}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={inputClass(Boolean(error))}
      />
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}
