"use client";

import { useState } from "react";
import { AreaBrowser, AreaSearch } from "@/components/address/AreaPicker";
import { AreaSheet } from "@/components/address/AreaSheet";
import { FieldError } from "@/components/ui/FieldError";
import { RequiredMark } from "@/components/ui/RequiredMark";
import type { DeliveryZone } from "@/lib/delivery-fee";
import { SRI_LANKAN_DISTRICTS } from "@/lib/districts";
import { areaToAddressFields, type Area } from "@/lib/sri-lanka/areas";

/**
 * "Find your area" — the block that replaces the old City input, District
 * <select> and Colombo-zone <select>.
 *
 * It never computes a delivery fee. Picking an area produces the same kind
 * of selection value the old Colombo <select> produced (a postal code, or
 * Wellampitiya's zone KEY), and the existing resolveZoneSelection() in
 * lib/delivery-fee.ts turns that into { zoneKey, postalCode } exactly as
 * before — so the quoted fee and what create_order_atomic charges still
 * come from one rule. lib/sri-lanka/fee-parity.test.ts is what proves it.
 *
 * Three states, following the approved design:
 *   - nothing picked  -> search box, a link to the step-by-step browser,
 *                        and the "my area isn't listed" escape hatch
 *   - area picked     -> the confirmation card plus read-only Province /
 *                        District / City / Postal code, and "Change area"
 *   - manual entry    -> the old free-text city + district <select>, for an
 *                        address the dataset genuinely does not contain
 */

export interface AreaValue {
  city: string;
  district: string;
  province: string;
  /** Real postal code OR a zone sentinel — the resolver's input, unchanged. */
  postalCode: string;
}

const readOnlyBox =
  "flex min-h-[44px] items-center rounded-[10px] bg-[#F3F4F6] px-[14px] text-sm font-semibold";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-[6px]">
      <span className="text-xs font-bold text-[#4B5563]">{label}</span>
      <div className={readOnlyBox}>
        <span className="truncate">{value || "—"}</span>
      </div>
    </div>
  );
}

export function CheckoutAreaField({
  value,
  zones,
  onChange,
  errors,
  idPrefix = "checkout",
}: {
  value: AreaValue;
  zones: DeliveryZone[];
  onChange: (next: AreaValue) => void;
  errors: { city?: string; district?: string; postalCode?: string };
  idPrefix?: string;
}) {
  const [browsing, setBrowsing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [manual, setManual] = useState(false);

  // A saved address arrives already filled, so it opens in the chosen state
  // with "Change area" — the customer does not have to re-pick it.
  const chosen = Boolean(value.city && value.district) && !manual;

  function pick(area: Area) {
    const fields = areaToAddressFields(area);
    onChange({
      city: fields.city,
      district: fields.district,
      province: fields.province,
      // The SELECTION value, not the raw postal code: this is what carries
      // Wellampitiya's zone key and keeps it on the Rs 255 rate.
      postalCode: fields.selectionValue,
    });
    setBrowsing(false);
    setSheetOpen(false);
    setManual(false);
  }

  if (chosen) {
    return (
      <div className="flex flex-col gap-4">
        {/* Confirmation card — mockup: navy-tinted, tick, "Change area" */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#D6E0EF] bg-[#F1F5FB] p-4">
          <div className="flex min-w-0 items-center gap-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#166534"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12.5l3 3 5-6" />
            </svg>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-extrabold text-[var(--pf-navy)]">{value.city}</div>
              <div className="truncate text-[13px] text-[#374151]">
                {value.district}
                {value.province ? ` · ${value.province} Province` : ""}
                {value.postalCode && /^\d{3,5}$/.test(value.postalCode) ? ` · ${value.postalCode}` : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ city: "", district: "", province: "", postalCode: "" })}
            className="min-h-[44px] rounded-[10px] border border-[var(--pf-navy)] bg-white px-4 text-[13px] font-bold text-[var(--pf-navy)]"
          >
            Change area
          </button>
        </div>

        {/* Read-only summary — mockup: four grey boxes */}
        <div className="flex flex-wrap gap-4">
          <ReadOnlyField label="PROVINCE" value={value.province} />
          <ReadOnlyField label="DISTRICT" value={value.district} />
          <ReadOnlyField label="CITY" value={value.city} />
          <ReadOnlyField
            label="POSTAL CODE"
            value={/^\d{3,5}$/.test(value.postalCode) ? value.postalCode : ""}
          />
        </div>
      </div>
    );
  }

  if (manual) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-[#4B5563]">
          Enter your city and district yourself.{" "}
          <button
            type="button"
            onClick={() => setManual(false)}
            className="font-bold text-[var(--pf-navy)] underline"
          >
            Search for an area instead
          </button>
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-[6px]">
            <label htmlFor={`${idPrefix}-manual-city`} className="text-[13px] font-bold">
              City
              <RequiredMark />
            </label>
            <input
              id={`${idPrefix}-manual-city`}
              type="text"
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? `${idPrefix}-manual-city-error` : undefined}
              className="min-h-[48px] rounded-[10px] border border-[#9CA3AF] px-[14px] text-base"
            />
            {errors.city && <FieldError id={`${idPrefix}-manual-city-error`} message={errors.city} />}
          </div>
          <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-[6px]">
            <label htmlFor={`${idPrefix}-manual-district`} className="text-[13px] font-bold">
              District
              <RequiredMark />
            </label>
            <select
              id={`${idPrefix}-manual-district`}
              value={value.district}
              onChange={(e) => onChange({ ...value, district: e.target.value, province: "" })}
              aria-invalid={Boolean(errors.district)}
              aria-describedby={errors.district ? `${idPrefix}-manual-district-error` : undefined}
              className="min-h-[48px] rounded-[10px] border border-[#9CA3AF] px-[14px] text-base"
            >
              <option value="">Select…</option>
              {SRI_LANKAN_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {errors.district && (
              <FieldError id={`${idPrefix}-manual-district-error`} message={errors.district} />
            )}
          </div>
          <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-[6px]">
            <label htmlFor={`${idPrefix}-manual-postal`} className="text-[13px] font-bold">
              Postal code
            </label>
            <input
              id={`${idPrefix}-manual-postal`}
              type="text"
              inputMode="numeric"
              value={/^\d{0,5}$/.test(value.postalCode) ? value.postalCode : ""}
              onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
              className="min-h-[48px] rounded-[10px] border border-[#9CA3AF] px-[14px] text-base"
            />
            {errors.postalCode && <FieldError id={`${idPrefix}-manual-postal-error`} message={errors.postalCode} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={`${idPrefix}-area`} className="text-[13px] font-bold">
        Find your area
        <RequiredMark />
      </label>

      {/* Phone opens the bottom sheet; desktop searches inline. */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-[52px] w-full items-center gap-[10px] rounded-xl border border-[#9CA3AF] px-[14px] text-left text-base text-[#4B5563]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4B5563"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          Type your city or area
        </button>
      </div>
      <div className="hidden sm:block">
        <AreaSearch inputId={`${idPrefix}-area`} zones={zones} onPick={pick} />
      </div>

      <p className="text-[13px] text-[#4B5563]">
        Not sure of the spelling?{" "}
        <button
          type="button"
          onClick={() => setBrowsing((b) => !b)}
          className="font-bold text-[var(--pf-navy)] underline"
          aria-expanded={browsing}
        >
          Choose Province, District and City step by step
        </button>
      </p>

      {browsing && (
        <div className="mt-2 hidden sm:block">
          <AreaBrowser zones={zones} onPick={pick} />
        </div>
      )}

      <p className="text-xs text-[#4B5563]">
        <button
          type="button"
          onClick={() => {
            setManual(true);
            setBrowsing(false);
          }}
          className="underline"
        >
          My area isn&apos;t listed
        </button>
      </p>

      {(errors.city || errors.district) && (
        <FieldError id={`${idPrefix}-area-error`} message={errors.city ?? errors.district ?? ""} />
      )}

      <AreaSheet open={sheetOpen} zones={zones} onPick={pick} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
