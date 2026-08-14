"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import type { GeneralSettings, BusinessDay } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";
const lockedInputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-black/5 px-3 py-2 text-sm text-[var(--color-text-secondary)]";

const DAYS: { key: BusinessDay; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function GeneralSettingsForm({ initial }: { initial: GeneralSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  function setDay(day: BusinessDay, patch: Partial<GeneralSettings["businessHours"][BusinessDay]>) {
    setValues((v) => ({
      ...v,
      businessHours: { ...v.businessHours, [day]: { ...v.businessHours[day], ...patch } },
    }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      { key: "general.store_name", value: values.storeName, type: "string", group_name: "general" },
      { key: "general.tagline", value: values.tagline, type: "string", group_name: "general" },
      { key: "general.description", value: values.description, type: "string", group_name: "general" },
      { key: "general.email", value: values.email, type: "string", group_name: "general" },
      { key: "general.phone", value: values.phone, type: "string", group_name: "general" },
      {
        key: "general.whatsapp_number",
        value: values.whatsappNumber,
        type: "string",
        group_name: "general",
      },
      { key: "general.address", value: values.address, type: "string", group_name: "general" },
      {
        key: "general.business_hours",
        value: values.businessHours,
        type: "json",
        group_name: "general",
      },
    ]);
    if (result.error) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    setStatus("saved");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Store name</label>
          <input
            type="text"
            value={values.storeName}
            onChange={(e) => set("storeName", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tagline</label>
          <input
            type="text"
            value={values.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Description</label>
        <textarea
          rows={2}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Support email</label>
          <input
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Support phone</label>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">WhatsApp number</label>
          <input
            type="text"
            inputMode="numeric"
            value={values.whatsappNumber}
            onChange={(e) => set("whatsappNumber", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="94775312484"
            className={inputClass}
          />
          <span className="text-xs text-[var(--muted)]">
            Digits only, country code first, no leading +.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Address</label>
        <textarea
          rows={2}
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Currency</label>
          <input type="text" value={values.currency} disabled className={lockedInputClass} />
          <span className="text-xs text-[var(--muted)]">Locked — single-currency store.</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Timezone</label>
          <input type="text" value={values.timezone} disabled className={lockedInputClass} />
          <span className="text-xs text-[var(--muted)]">Locked.</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Business hours</label>
        <div className="mt-2 flex flex-col gap-2">
          {DAYS.map((day) => {
            const hours = values.businessHours[day.key];
            return (
              <div
                key={day.key}
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2"
              >
                <span className="w-24 shrink-0 text-sm font-medium">{day.label}</span>
                <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={!hours.closed}
                    onChange={(e) => setDay(day.key, { closed: !e.target.checked })}
                  />
                  Open
                </label>
                {!hours.closed && (
                  <>
                    <input
                      type="time"
                      value={hours.open}
                      onChange={(e) => setDay(day.key, { open: e.target.value })}
                      className={`${inputClass} py-1`}
                    />
                    <span className="text-xs text-[var(--muted)]">to</span>
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(e) => setDay(day.key, { close: e.target.value })}
                      className={`${inputClass} py-1`}
                    />
                  </>
                )}
                {hours.closed && <span className="text-xs text-[var(--muted)]">Closed</span>}
              </div>
            );
          })}
        </div>
      </div>

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
