"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { StatusIndicator } from "@/components/admin/settings/StatusIndicator";
import type { CommissionSettings } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Marketplace groundwork -- the "Connecting Buyers & Sellers" direction
// this store is deliberately building toward, not active functionality
// today. Toggling this ON changes nothing about checkout, pricing, or any
// existing order -- there is no code anywhere yet that reads
// commission.enabled to affect a price. It's stored for a future phase.
export function CommissionSettingsForm({ initial }: { initial: CommissionSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof CommissionSettings>(key: K, value: CommissionSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      { key: "commission.enabled", value: values.enabled, type: "boolean", group_name: "commission" },
      { key: "commission.type", value: values.type, type: "string", group_name: "commission" },
      {
        key: "commission.default_percent",
        value: values.defaultPercent,
        type: "number",
        group_name: "commission",
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
        <div>
          <p className="text-sm font-medium">Commission system</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Future marketplace groundwork. Turning this on records the setting only — it does not
            deduct anything from current orders, checkout, or pricing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator active={values.enabled} />
          <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => set("enabled", e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-black/15 transition-colors peer-checked:bg-[var(--color-success)]" />
            <span className="relative h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Commission type</label>
          <select value={values.type} disabled className={`${inputClass} opacity-60`}>
            <option value="category_based">Category Based</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Default commission (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={values.defaultPercent}
            onChange={(e) => set("defaultPercent", Number(e.target.value))}
            className={inputClass}
          />
          <p className="text-xs text-[var(--muted)]">Used for any category without its own rule below.</p>
        </div>
      </div>

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
