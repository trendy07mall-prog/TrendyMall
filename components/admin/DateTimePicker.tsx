"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "@/components/ui/Icon";

// Shared by every admin date/time field (Campaigns, Hero Slides, Dashboard/
// Orders/Finance range filters, Expenses) -- see the audit in the commit
// this file was added in for the full list and why two admin forms
// (Coupons, General Settings' business-hours grid) are deliberately NOT on
// that list yet (uncontrolled-today / dense-repeating-grid, real structural
// work beyond "swap the input," left for a follow-up).
//
// Every native <input type="date"/"datetime-local"> this replaces commits
// on every keystroke/selection -- there's no "pending vs committed" concept
// in a browser's own picker UI. This component owns that distinction
// itself: opening seeds `pending` from the current committed value:
// picking a day or a time only updates `pending`; Cancel discards it;
// OK is the only path that ever calls onChange / updates the value this
// component reports outward. Callers (the parent forms) never see the
// difference -- same value/onChange/defaultValue/name contract a native
// input would offer, so nothing upstream of this component had to change.
//
// Deliberately indigo/purple-accented (bg-indigo-600 etc, literal Tailwind
// utilities, not this app's --foreground/--color-nav-active-pill tokens) --
// scoped to this file only, per the admin-panel-only accent the redesign
// asked for. Every customer-facing surface keeps the navy/orange brand
// tokens untouched; nothing here reads or writes them.
//
// Supports both calling conventions already in use across admin forms:
// controlled (value+onChange, e.g. CampaignForm) and uncontrolled
// (defaultValue+name inside a real <form>, e.g. DashboardHeader's plain
// GET form) -- committed value always lives in this component's own state
// either way, re-synced from `value` on change for controlled callers, and
// always mirrored into an internal hidden <input> when `name` is given so
// native form submission keeps working unchanged for the uncontrolled case.
export interface DateTimePickerProps {
  mode: "date" | "datetime";
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

interface Pending {
  year: number;
  month: number; // 0-11
  day: number;
  hour: number; // 0-23
  minute: number;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseValue(value: string): Pending | null {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  let hour = 12;
  let minute = 0;
  if (timePart) {
    const [h, min] = timePart.split(":").map(Number);
    if (!Number.isNaN(h)) hour = h;
    if (!Number.isNaN(min)) minute = min;
  }
  return { year: y, month: m - 1, day: d, hour, minute };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatValue(pending: Pending, mode: "date" | "datetime"): string {
  const datePart = `${pending.year}-${pad(pending.month + 1)}-${pad(pending.day)}`;
  if (mode === "date") return datePart;
  return `${datePart}T${pad(pending.hour)}:${pad(pending.minute)}`;
}

function formatDisplay(value: string, mode: "date" | "datetime"): string {
  const p = parseValue(value);
  if (!p) return "";
  const dateLabel = new Date(p.year, p.month, p.day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (mode === "date") return dateLabel;
  const period = p.hour >= 12 ? "PM" : "AM";
  const twelveHour = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${dateLabel}, ${twelveHour}:${pad(p.minute)} ${period}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function DateTimePicker({
  mode,
  name,
  id,
  value,
  defaultValue,
  onChange,
  required,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: DateTimePickerProps) {
  const [committed, setCommitted] = useState(value ?? defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Controlled callers (CampaignForm, HeroSlideForm, OrderFilterBar,
  // FinanceDateRangePicker) re-sync when their own state changes elsewhere
  // -- e.g. Cancel/reset flows outside this component. Uncontrolled
  // callers never pass `value`, so this never fires for them.
  useEffect(() => {
    // Syncing to an external signal (the controlled caller's own value
    // changed) -- same class of exception as the localStorage/matchMedia-
    // read effects elsewhere in this app.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value !== undefined) setCommitted(value);
  }, [value]);

  function openPicker() {
    const parsed = parseValue(committed);
    setPending(parsed);
    const now = new Date();
    setViewYear(parsed?.year ?? now.getFullYear());
    setViewMonth(parsed?.month ?? now.getMonth());
    setOpen(true);
  }

  function closeWithoutCommitting() {
    setOpen(false);
    setPending(null);
  }

  function commitPending() {
    if (pending) {
      const formatted = formatValue(pending, mode);
      setCommitted(formatted);
      onChange?.(formatted);
    }
    setOpen(false);
    setPending(null);
  }

  function clearValue() {
    setCommitted("");
    onChange?.("");
    setOpen(false);
    setPending(null);
  }

  function pickDay(day: number) {
    setPending((prev) => ({
      year: viewYear,
      month: viewMonth,
      day,
      hour: prev?.hour ?? 12,
      minute: prev?.minute ?? 0,
    }));
  }

  function goToday() {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setPending((prev) => ({
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: prev?.hour ?? 12,
      minute: prev?.minute ?? 0,
    }));
  }

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function setHour12(hour12: number) {
    setPending((prev) => {
      const base = prev ?? { year: viewYear, month: viewMonth, day: new Date().getDate(), hour: 12, minute: 0 };
      const isPm = base.hour >= 12;
      const hour24 = (hour12 % 12) + (isPm ? 12 : 0);
      return { ...base, hour: hour24 };
    });
  }

  function setMinute(minute: number) {
    setPending((prev) => {
      const base = prev ?? { year: viewYear, month: viewMonth, day: new Date().getDate(), hour: 12, minute: 0 };
      return { ...base, minute };
    });
  }

  function setPeriod(pm: boolean) {
    setPending((prev) => {
      const base = prev ?? { year: viewYear, month: viewMonth, day: new Date().getDate(), hour: 12, minute: 0 };
      const hour12 = base.hour % 12 === 0 ? 12 : base.hour % 12;
      const hour24 = (hour12 % 12) + (pm ? 12 : 0);
      return { ...base, hour: hour24 };
    });
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeWithoutCommitting();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const today = new Date();
  const isToday = (day: number) =>
    viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
  const isSelected = (day: number) =>
    pending != null && pending.year === viewYear && pending.month === viewMonth && pending.day === day;

  const hour12Selected = pending ? (pending.hour % 12 === 0 ? 12 : pending.hour % 12) : null;
  const isPmSelected = pending ? pending.hour >= 12 : null;

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={committed} required={required} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={openPicker}
        aria-label={ariaLabel}
        className={
          className ??
          "flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        }
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        <span className={committed ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
          {committed ? formatDisplay(committed, mode) : (placeholder ?? "Select…")}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[var(--z-modal)]">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={closeWithoutCommitting}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="absolute top-1/2 left-1/2 flex w-[320px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
          >
            <div className="flex max-h-[75vh] flex-col overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold">
                  {MONTH_LABELS[viewMonth]} {viewYear}
                </p>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  aria-label="Next month"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-xs text-[var(--muted)]">
                {WEEKDAY_LABELS.map((w) => (
                  <span key={w} className="py-1">
                    {w}
                  </span>
                ))}
                {cells.map((day, i) => (
                  <span key={i} className="flex items-center justify-center py-0.5">
                    {day != null && (
                      <button
                        type="button"
                        onClick={() => pickDay(day)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                          isSelected(day)
                            ? "bg-indigo-600 font-semibold text-white"
                            : isToday(day)
                              ? "border border-indigo-400 text-indigo-600"
                              : "text-[var(--foreground)] hover:bg-indigo-50"
                        }`}
                      >
                        {day}
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={goToday}
                className="mt-2 self-start rounded-full px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
              >
                Today
              </button>

              {mode === "datetime" && (
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                    <ClockIcon className="h-3.5 w-3.5" />
                    Time
                  </div>
                  <div className="mt-2 flex h-32 gap-2">
                    <div className="flex-1 overflow-y-auto rounded-lg bg-black/[0.03]">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHour12(h)}
                          className={`block w-full py-1.5 text-center text-sm ${
                            hour12Selected === h
                              ? "bg-indigo-600 font-semibold text-white"
                              : "hover:bg-indigo-50"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 overflow-y-auto rounded-lg bg-black/[0.03]">
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMinute(m)}
                          className={`block w-full py-1.5 text-center text-sm ${
                            pending?.minute === m ? "bg-indigo-600 font-semibold text-white" : "hover:bg-indigo-50"
                          }`}
                        >
                          {pad(m)}
                        </button>
                      ))}
                    </div>
                    <div className="flex w-14 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setPeriod(false)}
                        className={`flex-1 rounded-lg text-sm font-medium ${
                          isPmSelected === false
                            ? "bg-indigo-600 text-white"
                            : "bg-black/[0.03] hover:bg-indigo-50"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setPeriod(true)}
                        className={`flex-1 rounded-lg text-sm font-medium ${
                          isPmSelected === true ? "bg-indigo-600 text-white" : "bg-black/[0.03] hover:bg-indigo-50"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
              {!required && committed ? (
                <button
                  type="button"
                  onClick={clearValue}
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeWithoutCommitting}
                  className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitPending}
                  disabled={pending == null}
                  className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
