"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveDeliveryZone } from "@/lib/admin/delivery-zones";
import type { AdminDeliveryZone } from "@/lib/admin/delivery-zones-query";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Modeled on HeroSlideForm.tsx. Postal-code-RANGE inputs, deliberately not
// a district dropdown -- the whole point of this feature per the Phase 3
// plan is making the ambiguous "district vs postal code" distinction
// unambiguous in the admin UI, not just preserving it under the hood.
export function DeliveryZoneForm({
  initial,
  onSaved,
}: {
  initial: AdminDeliveryZone | null;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveDeliveryZone, undefined);

  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !state?.error) {
      submittedRef.current = false;
      onSaved?.();
    }
  }, [state, onSaved]);

  const [name, setName] = useState(initial?.name ?? "");
  const [postalCodeStart, setPostalCodeStart] = useState(initial?.postal_code_start ?? "");
  const [postalCodeEnd, setPostalCodeEnd] = useState(initial?.postal_code_end ?? "");
  const [districtMatch, setDistrictMatch] = useState(initial?.district_match ?? "");
  const [rate, setRate] = useState(String(initial?.rate ?? ""));
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="id" defaultValue={initial?.id ?? ""} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Zone name</label>
        <input
          type="text"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Colombo 1-15"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Postal code start (optional)</label>
          <input
            type="text"
            name="postalCodeStart"
            value={postalCodeStart}
            onChange={(e) => setPostalCodeStart(e.target.value)}
            placeholder="00100"
            disabled={isDefault}
            className={`${inputClass} disabled:opacity-40`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Postal code end (optional)</label>
          <input
            type="text"
            name="postalCodeEnd"
            value={postalCodeEnd}
            onChange={(e) => setPostalCodeEnd(e.target.value)}
            placeholder="01500"
            disabled={isDefault}
            className={`${inputClass} disabled:opacity-40`}
          />
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        5-digit postal codes (e.g. 00100–01500 for Colombo 1–15). Leave both blank only for the default/
        catch-all zone below.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">District match (optional)</label>
        <input
          type="text"
          name="districtMatch"
          value={districtMatch}
          onChange={(e) => setDistrictMatch(e.target.value)}
          placeholder="Colombo"
          disabled={isDefault}
          className={`${inputClass} disabled:opacity-40`}
        />
        <span className="text-xs text-[var(--muted)]">
          If set, this zone only applies when the customer&apos;s selected district exactly matches (case
          sensitive). Leave blank to match any district within the postal range.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Delivery rate (LKR)</label>
        <input
          type="number"
          name="rate"
          min={0}
          step={1}
          required
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className={`${inputClass} max-w-40`}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Default / catch-all zone (used whenever no other active zone matches — exactly one zone should be
        marked default)
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          name="status"
          value="inactive"
          disabled={pending}
          className="transition-brand rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save as Inactive"}
        </button>
        <button
          type="submit"
          name="status"
          value="active"
          disabled={pending}
          className="transition-brand rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save as Active"}
        </button>
      </div>
    </form>
  );
}
