"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { StatusIndicator } from "@/components/admin/settings/StatusIndicator";
import type { MaintenanceSettings } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function MaintenanceSettingsForm({ initial }: { initial: MaintenanceSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof MaintenanceSettings>(key: K, value: MaintenanceSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      { key: "maintenance.enabled", value: values.enabled, type: "boolean", group_name: "maintenance" },
      { key: "maintenance.message", value: values.message, type: "string", group_name: "maintenance" },
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
          <p className="text-sm font-medium">Maintenance mode</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Blocks every storefront page for customers — they see the message below instead. Your admin
            login and the entire admin panel are never affected, and you&apos;ll still see the real
            storefront while logged in as admin.
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

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Message shown to customers</label>
        <textarea
          rows={3}
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          className={inputClass}
        />
      </div>

      <a
        href="/maintenance"
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit text-sm underline"
      >
        Preview the maintenance page →
      </a>

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
