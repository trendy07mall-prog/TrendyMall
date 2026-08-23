"use client";

import { useActionState, useState } from "react";
import { saveAddress } from "@/lib/addresses";
import { isValidSriLankanPhone } from "@/lib/utils";
import { SRI_LANKAN_CITIES } from "@/lib/cities";
import { SRI_LANKAN_DISTRICTS } from "@/lib/districts";
import { Field } from "@/components/ui/Field";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { FieldError } from "@/components/ui/FieldError";
import type { CustomerAddress } from "@/types";

const LABEL_PRESETS = ["Home", "Work"] as const;
// "" = nothing picked yet (no pill pressed, custom field hidden) -- the
// default for a brand-new address, so it doesn't open with "Other"
// pre-selected and an empty custom-label box already showing.
type LabelPreset = (typeof LABEL_PRESETS)[number] | "Other" | "";

const inputClass = (hasError: boolean) =>
  `rounded-[var(--radius-input)] border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    hasError
      ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
      : "border-[var(--border)] focus:ring-[var(--foreground)]"
  }`;

type AddressFieldKey = "firstName" | "lastName" | "phone" | "street" | "city" | "district";
type AddressFieldErrors = Partial<Record<AddressFieldKey, string>>;

interface AddressFields {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  district: string;
}

// Mirrors components/checkout/CheckoutAddress.tsx's validation messages for
// the same field set (that page already solved this exact problem) --
// postal code stays optional here, unlike checkout, since the account
// address book never computes a delivery fee from it.
function validateAddressFields(f: AddressFields): AddressFieldErrors {
  const errors: AddressFieldErrors = {};
  if (!f.firstName.trim()) errors.firstName = "Please enter a first name.";
  if (!f.lastName.trim()) errors.lastName = "Please enter a last name.";
  if (!f.phone.trim()) {
    errors.phone = "Please enter a phone number.";
  } else if (!isValidSriLankanPhone(f.phone)) {
    errors.phone = "Please enter a valid Sri Lankan phone number.";
  }
  if (!f.street.trim()) errors.street = "Please enter a street address.";
  if (!f.city.trim()) errors.city = "Please enter a city.";
  if (!f.district.trim()) errors.district = "Please select a district.";
  return errors;
}

const FIELD_FOCUS_ORDER: { key: AddressFieldKey; domId: string }[] = [
  { key: "firstName", domId: "addr-firstName" },
  { key: "lastName", domId: "addr-lastName" },
  { key: "phone", domId: "addr-phone" },
  { key: "street", domId: "addr-street" },
  { key: "city", domId: "addr-city" },
  { key: "district", domId: "addr-district" },
];

export function AddressForm({
  address,
  onSaved,
}: {
  address: CustomerAddress | null;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveAddress, undefined);

  const initialLabel = address?.address_label ?? "";
  const initialPreset: LabelPreset = (LABEL_PRESETS as readonly string[]).includes(initialLabel)
    ? (initialLabel as LabelPreset)
    : initialLabel
      ? "Other"
      : "";

  const [labelPreset, setLabelPreset] = useState<LabelPreset>(initialPreset);
  const [customLabel, setCustomLabel] = useState(initialPreset === "Other" ? initialLabel : "");
  const effectiveLabel = labelPreset === "Other" ? customLabel.trim() : labelPreset;

  const [firstName, setFirstName] = useState(address?.first_name ?? "");
  const [lastName, setLastName] = useState(address?.last_name ?? "");
  const [phone, setPhone] = useState(address?.phone ?? "");
  const [street, setStreet] = useState(address?.street ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [district, setDistrict] = useState(address?.district ?? "");
  const [postalCode, setPostalCode] = useState(address?.postal_code ?? "");
  const [isDefault, setIsDefault] = useState(address?.is_default ?? false);
  const [errors, setErrors] = useState<AddressFieldErrors>({});

  function currentFields(): AddressFields {
    return { firstName, lastName, phone, street, city, district };
  }

  function handleFieldChange(field: AddressFieldKey, value: string) {
    const next = { ...currentFields(), [field]: value };
    if (field === "firstName") setFirstName(value);
    else if (field === "lastName") setLastName(value);
    else if (field === "phone") setPhone(value);
    else if (field === "street") setStreet(value);
    else if (field === "city") setCity(value);
    else setDistrict(value);

    setErrors((prev) => (prev[field] ? { ...prev, [field]: validateAddressFields(next)[field] } : prev));
  }

  function handleBlur(field: AddressFieldKey) {
    setErrors((prev) => ({ ...prev, [field]: validateAddressFields(currentFields())[field] }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const fieldErrors = validateAddressFields(currentFields());
    setErrors(fieldErrors);

    const firstInvalid = FIELD_FOCUS_ORDER.find((f) => fieldErrors[f.key]);
    if (firstInvalid) {
      event.preventDefault();
      requestAnimationFrame(() => {
        const el = document.getElementById(firstInvalid.domId);
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    // Otherwise let the action prop's async wrapper run normally (calls
    // saveAddress then onSaved()) -- untouched.
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onSaved();
      }}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="id" defaultValue={address?.id ?? ""} />
      <input type="hidden" name="addressLabel" value={effectiveLabel} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Label (optional)</label>
        <div className="flex flex-wrap gap-2">
          {LABEL_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLabelPreset(preset)}
              aria-pressed={labelPreset === preset}
              className={`transition-brand min-h-11 rounded-full border px-4 text-sm font-medium ${
                labelPreset === preset
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                  : "border-[var(--border)] hover:bg-black/5"
              }`}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLabelPreset("Other")}
            aria-pressed={labelPreset === "Other"}
            className={`transition-brand min-h-11 rounded-full border px-4 text-sm font-medium ${
              labelPreset === "Other"
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                : "border-[var(--border)] hover:bg-black/5"
            }`}
          >
            Other
          </button>
        </div>
        {labelPreset === "Other" && (
          <input
            type="text"
            placeholder="e.g. Office, Mom's House"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            className={`mt-2 ${inputClass(false)}`}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="addr-firstName"
          name="firstName"
          label="First name"
          value={firstName}
          onChange={(v) => handleFieldChange("firstName", v)}
          onBlur={() => handleBlur("firstName")}
          error={errors.firstName}
          required
        />
        <Field
          id="addr-lastName"
          name="lastName"
          label="Last name"
          value={lastName}
          onChange={(v) => handleFieldChange("lastName", v)}
          onBlur={() => handleBlur("lastName")}
          error={errors.lastName}
          required
        />
      </div>

      <Field
        id="addr-phone"
        name="phone"
        label="Phone"
        type="tel"
        placeholder="07XXXXXXXX"
        value={phone}
        onChange={(v) => handleFieldChange("phone", v)}
        onBlur={() => handleBlur("phone")}
        error={errors.phone}
        required
      />

      <Field
        id="addr-street"
        name="street"
        label="Street address"
        value={street}
        onChange={(v) => handleFieldChange("street", v)}
        onBlur={() => handleBlur("street")}
        error={errors.street}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="addr-city" className="text-sm font-medium">
            City
            <RequiredMark />
          </label>
          <input
            id="addr-city"
            name="city"
            type="text"
            list="account-address-city-options"
            autoComplete="off"
            value={city}
            onChange={(e) => handleFieldChange("city", e.target.value)}
            onBlur={() => handleBlur("city")}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "addr-city-error" : undefined}
            className={inputClass(Boolean(errors.city))}
          />
          <datalist id="account-address-city-options">
            {SRI_LANKAN_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.city && <FieldError id="addr-city-error" message={errors.city} />}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="addr-district" className="text-sm font-medium">
            District
            <RequiredMark />
          </label>
          <select
            id="addr-district"
            name="district"
            value={district}
            onChange={(e) => handleFieldChange("district", e.target.value)}
            onBlur={() => handleBlur("district")}
            aria-invalid={Boolean(errors.district)}
            aria-describedby={errors.district ? "addr-district-error" : undefined}
            className={inputClass(Boolean(errors.district))}
          >
            <option value="">Select…</option>
            {SRI_LANKAN_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {errors.district && <FieldError id="addr-district-error" message={errors.district} />}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="addr-postalCode" className="text-sm font-medium">
          Postal code (optional)
        </label>
        <input
          id="addr-postalCode"
          name="postalCode"
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          className={inputClass(false)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Set as default address
      </label>

      {state?.error && <FieldError message={state.error} />}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Address"}
      </button>
    </form>
  );
}
