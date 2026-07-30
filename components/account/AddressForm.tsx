"use client";

import { useActionState } from "react";
import { saveAddress } from "@/lib/addresses";
import { SRI_LANKAN_CITIES } from "@/lib/cities";
import { SRI_LANKAN_DISTRICTS } from "@/lib/districts";
import type { CustomerAddress } from "@/types";

const inputClass =
  "rounded-[var(--radius-input)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function AddressForm({
  address,
  onSaved,
}: {
  address: CustomerAddress | null;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveAddress, undefined);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onSaved();
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="id" defaultValue={address?.id ?? ""} />

      <div className="flex flex-col gap-1">
        <label htmlFor="addressLabel" className="text-sm font-medium">
          Label (optional)
        </label>
        <input
          id="addressLabel"
          name="addressLabel"
          type="text"
          placeholder="e.g. Home, Office"
          defaultValue={address?.address_label ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="firstName" className="text-sm font-medium">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={address?.first_name ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="lastName" className="text-sm font-medium">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            defaultValue={address?.last_name ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="07XXXXXXXX"
          defaultValue={address?.phone ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="street" className="text-sm font-medium">
          Street address
        </label>
        <input
          id="street"
          name="street"
          type="text"
          required
          defaultValue={address?.street ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="city" className="text-sm font-medium">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            list="address-city-options"
            autoComplete="off"
            defaultValue={address?.city ?? ""}
            className={inputClass}
          />
          <datalist id="address-city-options">
            {SRI_LANKAN_CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="district" className="text-sm font-medium">
            District
          </label>
          <select
            id="district"
            name="district"
            required
            defaultValue={address?.district ?? ""}
            className={inputClass}
          >
            <option value="">Select…</option>
            {SRI_LANKAN_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="postalCode" className="text-sm font-medium">
          Postal code (optional)
        </label>
        <input
          id="postalCode"
          name="postalCode"
          type="text"
          defaultValue={address?.postal_code ?? ""}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isDefault" defaultChecked={address?.is_default ?? false} />
        Set as default address
      </label>

      {state?.error && <p className="text-sm text-[var(--color-discount)]">{state.error}</p>}

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
