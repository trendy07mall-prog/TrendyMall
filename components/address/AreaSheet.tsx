"use client";

import { useEffect, useRef, useState } from "react";
import type { DeliveryZone } from "@/lib/delivery-fee";
import type { Area } from "@/lib/sri-lanka/areas";
import { AreaBrowser, AreaSearch } from "./AreaPicker";

/**
 * The phone bottom sheet, built to MobileSheet.dc.html: a full-height white
 * sheet with a grab handle, a close button, the search box, and two pills
 * that switch between searching and browsing by province.
 *
 * Accessibility is the part a bottom sheet usually gets wrong, so: it is a
 * real modal dialog, focus moves into it on open and returns to whatever
 * opened it on close, Escape closes it, Tab is trapped inside, and the page
 * behind it cannot scroll.
 */
export function AreaSheet({
  open,
  zones,
  onPick,
  onClose,
}: {
  open: boolean;
  zones: DeliveryZone[];
  onPick: (area: Area) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"search" | "browse">("search");
  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember what to give focus back to, so closing the sheet does not
    // dump the caret at the top of the page.
    openerRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      // Trap Tab inside the sheet.
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="area-sheet-title"
        className="flex h-[85vh] flex-col rounded-t-[24px] bg-white px-4 pt-3"
      >
        {/* Grab handle — mockup: 44x5, #D1D5DB */}
        <div aria-hidden="true" className="mb-[14px] h-[5px] w-11 self-center rounded-full bg-[#D1D5DB]" />

        <div className="mb-3 flex items-center justify-between">
          <h2 id="area-sheet-title" className="m-0 text-lg font-extrabold">
            Choose your area
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="h-11 w-11 rounded-full border-0 bg-[#F3F4F6] text-lg text-[#374151]"
          >
            ✕
          </button>
        </div>

        {mode === "search" ? (
          <AreaSearch
            zones={zones}
            onPick={onPick}
            autoFocus
            tallRows
            placeholder="Type your city or area"
          />
        ) : null}

        <div className="my-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("search")}
            aria-pressed={mode === "search"}
            className={`min-h-[44px] rounded-full px-4 text-[13px] font-bold ${
              mode === "search"
                ? "border-0 bg-[var(--pf-navy)] text-white"
                : "border border-[#CBD5E1] bg-white font-semibold text-[#374151]"
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setMode("browse")}
            aria-pressed={mode === "browse"}
            className={`min-h-[44px] rounded-full px-4 text-[13px] font-bold ${
              mode === "browse"
                ? "border-0 bg-[var(--pf-navy)] text-white"
                : "border border-[#CBD5E1] bg-white font-semibold text-[#374151]"
            }`}
          >
            Browse by Province
          </button>
        </div>

        {mode === "browse" ? (
          <div className="flex-1 overflow-y-auto pb-4">
            <AreaBrowser zones={zones} onPick={onPick} />
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
