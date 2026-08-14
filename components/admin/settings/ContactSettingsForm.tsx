"use client";

import { useState } from "react";
import Link from "next/link";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { StatusIndicator } from "@/components/admin/settings/StatusIndicator";
import type { ContactSettings, GeneralSettings } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

function formatHours(businessHours: GeneralSettings["businessHours"]) {
  const days = Object.values(businessHours);
  const allSame = days.every(
    (d) => d.open === days[0].open && d.close === days[0].close && d.closed === days[0].closed,
  );
  if (allSame && !days[0].closed) {
    return `Daily, ${days[0].open}–${days[0].close}`;
  }
  return "Varies by day — see General settings";
}

export function ContactSettingsForm({
  initial,
  general,
}: {
  initial: ContactSettings;
  general: GeneralSettings;
}) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof ContactSettings>(key: K, value: ContactSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      {
        key: "contact.whatsapp_enabled",
        value: values.whatsappEnabled,
        type: "boolean",
        group_name: "contact",
      },
      {
        key: "contact.whatsapp_default_message",
        value: values.whatsappDefaultMessage,
        type: "string",
        group_name: "contact",
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
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-black/[0.02] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
            From General settings
          </p>
          <Link href="/admin/settings/general" className="text-xs font-medium underline">
            Edit in General
          </Link>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">Email</dt>
            <dd className="font-medium">{general.email}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Phone</dt>
            <dd className="font-medium">{general.phone}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">WhatsApp number</dt>
            <dd className="font-medium">{general.whatsappNumber}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Support hours</dt>
            <dd className="font-medium">{formatHours(general.businessHours)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
        <div>
          <p className="text-sm font-medium">Floating WhatsApp button</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Controls the real floating WhatsApp button shown across the storefront.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator active={values.whatsappEnabled} />
          <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={values.whatsappEnabled}
              onChange={(e) => set("whatsappEnabled", e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-black/15 transition-colors peer-checked:bg-[var(--color-success)]" />
            <span className="relative h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]" />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Default WhatsApp message</label>
        <textarea
          rows={2}
          value={values.whatsappDefaultMessage}
          onChange={(e) => set("whatsappDefaultMessage", e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-[var(--muted)]">
          Prefilled when a visitor taps the floating WhatsApp button.
        </span>
      </div>

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
