"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DeliveryZone } from "@/lib/delivery-fee";
import {
  ALL_PROVINCES,
  areasForDistrictLabel,
  districtLabelsForProvince,
  type Area,
} from "@/lib/sri-lanka/areas";
import { searchAreas } from "@/lib/sri-lanka/search";
import { feeForArea, formatFee } from "./area-fee";

/**
 * The two ways to choose an area, built to the approved mockup
 * (Address.dc.html): a type-ahead search box, and a Province > District >
 * City browser. Both hand back the same Area, so everything downstream --
 * the fee, the stored columns, the read-only summary -- is identical
 * whichever route someone took.
 *
 * Colours: #0F2D52 is the project's --pf-navy and is referenced as the
 * token. The rest (#F1F5FB, #DCFCE7, #166534, #D6E0EF) are the mockup's own
 * values, used literally because the mockup is the spec.
 */

const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4B5563"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
    className="pointer-events-none absolute left-[14px]"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

/** One result row — mockup: 56px tall, name over "District · Province", fee pill right. */
function AreaRow({
  area,
  zones,
  selected,
  id,
  onPick,
  tall = false,
}: {
  area: Area;
  zones: DeliveryZone[];
  selected: boolean;
  id: string;
  onPick: (area: Area) => void;
  tall?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      onClick={() => onPick(area)}
      className={`flex w-full items-center justify-between gap-3 border-0 border-b border-[#F3F4F6] px-4 py-2 text-left last:border-b-0 ${
        tall ? "min-h-[60px]" : "min-h-[56px]"
      } ${selected ? "bg-[#F1F5FB]" : "bg-white hover:bg-black/[0.03]"}`}
    >
      <span className="min-w-0">
        <span
          className={`block truncate text-sm ${
            selected ? "font-extrabold text-[var(--pf-navy)]" : "font-bold text-[#111827]"
          }`}
        >
          {area.displayName}
        </span>
        <span className="block truncate text-xs text-[#4B5563]">
          {area.districtLabel} · {area.province}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-[#DCFCE7] px-[10px] py-1 text-xs font-bold text-[#166534]">
        {formatFee(feeForArea(area, zones))}
      </span>
    </button>
  );
}

/**
 * The search combobox. A real combobox: aria-expanded, aria-activedescendant,
 * arrow keys, Enter to pick, Escape to close.
 */
export function AreaSearch({
  zones,
  onPick,
  autoFocus = false,
  tallRows = false,
  inputId,
  placeholder = "Type your city or area, e.g. Borella, Kandy, Nugegoda",
}: {
  zones: DeliveryZone[];
  onPick: (area: Area) => void;
  autoFocus?: boolean;
  tallRows?: boolean;
  inputId?: string;
  placeholder?: string;
}) {
  const generatedId = useId();
  const id = inputId ?? generatedId;
  const listboxId = `${id}-listbox`;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchAreas(query), [query]);
  const open = results.length > 0;

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onPick(results[active]);
      setQuery("");
    } else if (event.key === "Escape") {
      setQuery("");
    }
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="relative flex items-center">
        <SearchIcon />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          // 16px on purpose: anything smaller makes iOS Safari zoom the page
          // on focus, which the approved mobile design explicitly avoids.
          className="min-h-[52px] w-full rounded-xl border border-[#9CA3AF] py-0 pr-[14px] pl-[44px] text-base focus:border-2 focus:border-[var(--pf-navy)] focus:outline-none"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
        />
      </div>

      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label="Matching areas"
        className={
          open
            ? "flex max-h-[340px] flex-col overflow-y-auto rounded-xl border border-[#D1D5DB]"
            : "sr-only"
        }
      >
        {results.map((area, i) => (
          <AreaRow
            key={area.id}
            id={`${id}-opt-${i}`}
            area={area}
            zones={zones}
            selected={i === active}
            onPick={(a) => {
              onPick(a);
              setQuery("");
            }}
            tall={tallRows}
          />
        ))}
      </div>

      {query.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-[#4B5563]" role="status">
          No area matches “{query.trim()}”. Check the spelling, or browse by province below.
        </p>
      )}
    </div>
  );
}

/** One column of the step-by-step browser. */
function BrowserColumn({
  heading,
  items,
  selected,
  onSelect,
  chevron = false,
  grow = 1,
}: {
  heading: string;
  items: { key: string; label: string }[];
  selected: string | null;
  onSelect: (key: string) => void;
  chevron?: boolean;
  grow?: number;
}) {
  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden border-r border-[#E5E7EB] last:border-r-0"
      style={{ flex: `${grow} 1 0%` }}
    >
      <div className="bg-[#F9FAFB] px-[14px] py-[10px] text-[11px] font-extrabold tracking-[1px] text-[#4B5563]">
        {heading}
      </div>
      <div className="flex flex-col overflow-y-auto" role="listbox" aria-label={heading}>
        {items.map((item) => {
          const isSelected = item.key === selected;
          return (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(item.key)}
              className={`min-h-[44px] shrink-0 border-0 px-[14px] text-left text-sm ${
                isSelected
                  ? "bg-[#F1F5FB] font-extrabold text-[var(--pf-navy)]"
                  : "bg-white text-[#111827] hover:bg-black/[0.03]"
              }`}
            >
              {item.label}
              {chevron ? " ›" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Province > District > City, the mockup's 380px three-column picker. */
export function AreaBrowser({
  zones,
  onPick,
}: {
  zones: DeliveryZone[];
  onPick: (area: Area) => void;
}) {
  const [province, setProvince] = useState<string | null>(null);
  const [districtLabel, setDistrictLabel] = useState<string | null>(null);

  const districts = province ? districtLabelsForProvince(province) : [];
  const areas = province && districtLabel ? areasForDistrictLabel(province, districtLabel) : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb — mockup: Western › Colombo (1-15) › Choose city */}
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#4B5563]">
        <span className={province ? "" : "font-extrabold text-[var(--pf-navy)]"}>
          {province ?? "Choose province"}
        </span>
        <span aria-hidden="true">›</span>
        <span className={province && !districtLabel ? "font-extrabold text-[var(--pf-navy)]" : ""}>
          {districtLabel ?? "Choose district"}
        </span>
        <span aria-hidden="true">›</span>
        <span className={districtLabel ? "font-extrabold text-[var(--pf-navy)]" : ""}>Choose city</span>
      </div>

      <div className="flex h-[380px] overflow-hidden rounded-xl border border-[#D1D5DB]">
        <BrowserColumn
          heading="PROVINCE"
          items={ALL_PROVINCES.map((p) => ({ key: p, label: p }))}
          selected={province}
          chevron
          onSelect={(p) => {
            setProvince(p);
            setDistrictLabel(null);
          }}
        />
        <BrowserColumn
          heading="DISTRICT"
          items={districts.map((d) => ({ key: d, label: d }))}
          selected={districtLabel}
          chevron
          onSelect={setDistrictLabel}
        />
        <div className="flex min-w-0 flex-[1.3] flex-col overflow-hidden">
          <div className="bg-[#F9FAFB] px-[14px] py-[10px] text-[11px] font-extrabold tracking-[1px] text-[#4B5563]">
            CITY
          </div>
          <div className="flex flex-col overflow-y-auto" role="listbox" aria-label="City">
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onPick(area)}
                className="flex min-h-[44px] shrink-0 items-center justify-between gap-2 border-0 bg-white px-[14px] text-left text-sm text-[#111827] hover:bg-black/[0.03]"
              >
                <span className="truncate">{area.displayName}</span>
                <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2 py-[2px] text-[11px] font-bold text-[#166534]">
                  {formatFee(feeForArea(area, zones))}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
