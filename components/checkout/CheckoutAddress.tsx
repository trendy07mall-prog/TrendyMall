"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { saveAddress } from "@/lib/addresses";
import { isValidSriLankanPhone } from "@/lib/utils";
import { SRI_LANKAN_CITIES } from "@/lib/cities";
import { SRI_LANKAN_DISTRICTS } from "@/lib/districts";
import type { CustomerAddress } from "@/types";

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
  return {
    firstName: address.first_name,
    lastName: address.last_name,
    phone: address.phone,
    street: address.street,
    city: address.city,
    district: address.district,
    postalCode: address.postal_code ?? "",
  };
}

type Mode = "card" | "picker" | "form";
type FieldErrors = Partial<Record<keyof CheckoutAddressFields, string>>;

function validateAddressFields(
  fields: CheckoutAddressFields,
  requireFullAddress: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.firstName.trim()) errors.firstName = "Required.";
  if (!fields.lastName.trim()) errors.lastName = "Required.";
  if (!isValidSriLankanPhone(fields.phone)) errors.phone = "Enter a valid Sri Lankan number.";
  if (requireFullAddress) {
    if (!fields.street.trim()) errors.street = "Required.";
    if (!fields.city.trim()) errors.city = "Required.";
    if (!fields.district.trim()) errors.district = "Select a district.";
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
  }
>(function CheckoutAddress({ addresses, onFieldsChange, requireFullAddress }, ref) {
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
      if (saveForNextTime) {
        const formData = buildFormData(fields, null);
        const result = await saveAddress(undefined, formData);
        if (result?.error) return { fields, sourceAddressId: null, error: result.error };
        return { fields, sourceAddressId: result?.id ?? null };
      }

      return { fields, sourceAddressId: null };
    },
  }));

  function updateField(field: keyof CheckoutAddressFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
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
          className="mt-3 text-sm underline"
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
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="edit-scope"
                checked={editScope === "order-only"}
                onChange={() => setEditScope("order-only")}
              />
              Update just this order
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="edit-scope"
                checked={editScope === "update-saved"}
                onChange={() => setEditScope("update-saved")}
              />
              Also update my saved address
            </label>
          </div>
        ) : (
          <label className="mb-4 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={saveForNextTime}
              onChange={(e) => setSaveForNextTime(e.target.checked)}
            />
            Save this information for faster checkout next time
          </label>
        )}

        <div className="grid grid-cols-2 gap-4">
          <AddrField
            id="checkout-firstName"
            label="First name"
            value={fields.firstName}
            onChange={(v) => updateField("firstName", v)}
            onBlur={() => handleBlur("firstName")}
            error={errors.firstName}
          />
          <AddrField
            id="checkout-lastName"
            label="Last name"
            value={fields.lastName}
            onChange={(v) => updateField("lastName", v)}
            onBlur={() => handleBlur("lastName")}
            error={errors.lastName}
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
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="checkout-city" className="text-sm font-medium">
                  City
                </label>
                <input
                  id="checkout-city"
                  type="text"
                  list="checkout-city-options"
                  autoComplete="off"
                  value={fields.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  onBlur={() => handleBlur("city")}
                  className={inputClass(Boolean(errors.city))}
                />
                <datalist id="checkout-city-options">
                  {SRI_LANKAN_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                {errors.city && <p className="text-xs text-red-600">{errors.city}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="checkout-district" className="text-sm font-medium">
                  District
                </label>
                <select
                  id="checkout-district"
                  value={fields.district}
                  onChange={(e) => updateField("district", e.target.value)}
                  onBlur={() => handleBlur("district")}
                  className={inputClass(Boolean(errors.district))}
                >
                  <option value="">Select…</option>
                  {SRI_LANKAN_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.district && <p className="text-xs text-red-600">{errors.district}</p>}
              </div>
            </div>
            <div className="mt-4">
              <AddrField
                id="checkout-postalCode"
                label="Postal code (optional)"
                value={fields.postalCode}
                onChange={(v) => updateField("postalCode", v)}
              />
            </div>
          </>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleUseThisAddress}
            className="transition-brand rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
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
              className="text-sm text-[var(--muted)] underline"
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
      <p className="font-medium">
        {fields.firstName} {fields.lastName}
      </p>
      <p className="mt-1 text-[var(--muted)]">{fields.phone}</p>
      {requireFullAddress && (
        <p className="text-[var(--muted)]">
          {fields.street}, {fields.city}, {fields.district}
          {fields.postalCode ? ` ${fields.postalCode}` : ""}
        </p>
      )}
      <div className="mt-3 flex items-center gap-4">
        <button type="button" onClick={startEdit} className="text-sm underline">
          Edit
        </button>
        {addresses.length > 1 && (
          <button type="button" onClick={() => setMode("picker")} className="text-sm underline">
            Change
          </button>
        )}
        <button type="button" onClick={startAddNew} className="text-sm underline">
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
    hasError ? "border-red-600 focus:ring-red-600" : "border-[var(--border)] focus:ring-[var(--foreground)]"
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={inputClass(Boolean(error))}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
