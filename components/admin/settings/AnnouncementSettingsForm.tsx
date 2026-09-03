"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { StatusIndicator } from "@/components/admin/settings/StatusIndicator";
import { PlusIcon, TrashIcon } from "@/components/ui/Icon";
import { ActionButton } from "@/components/ui/ActionButton";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE, type DeliveryZone } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/utils";
import type { AnnouncementMessage, AnnouncementMessageKind, AnnouncementSettings } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const KIND_LABELS: Record<AnnouncementMessageKind, string> = {
  delivery_in_zone: "Delivery rate — Colombo 1-15",
  delivery_outside_zone: "Delivery rate — Outside Colombo",
  cod: "Cash on Delivery",
  whatsapp: "WhatsApp contact",
  custom: "Custom message",
};

const MAX_MESSAGES = 4;

// The two delivery kinds always render the REAL rate (Settings-driven
// delivery_zones, Phase 3) -- an admin can pick that this slot shows the
// delivery rate, but can never type the number itself, so this preview
// can't drift from the real shipping calculation.
function previewText(message: AnnouncementMessage, inZoneRate: number, outsideZoneRate: number): string {
  if (message.kind === "delivery_in_zone") return `Colombo 1–15: ${formatPrice(inZoneRate)}`;
  if (message.kind === "delivery_outside_zone") return `Outside Colombo: ${formatPrice(outsideZoneRate)}`;
  return message.text ?? "";
}

export function AnnouncementSettingsForm({ initial, zones }: { initial: AnnouncementSettings; zones: DeliveryZone[] }) {
  const inZoneRate = zones.find((zone) => zone.districtMatch === "Colombo")?.rate ?? RATE_IN_ZONE;
  const outsideZoneRate = zones.find((zone) => zone.isDefault)?.rate ?? RATE_OUTSIDE_ZONE;
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof AnnouncementSettings>(key: K, value: AnnouncementSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  function setMessage(index: number, patch: Partial<AnnouncementMessage>) {
    setValues((v) => ({
      ...v,
      messages: v.messages.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));
    setStatus("idle");
  }

  function addMessage() {
    if (values.messages.length >= MAX_MESSAGES) return;
    setValues((v) => ({ ...v, messages: [...v.messages, { kind: "custom", text: "" }] }));
    setStatus("idle");
  }

  function removeMessage(index: number) {
    setValues((v) => ({ ...v, messages: v.messages.filter((_, i) => i !== index) }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      { key: "announcement.enabled", value: values.enabled, type: "boolean", group_name: "announcement" },
      {
        key: "announcement.messages",
        value: values.messages,
        type: "json",
        group_name: "announcement",
      },
      {
        key: "announcement.auto_rotate",
        value: values.autoRotate,
        type: "boolean",
        group_name: "announcement",
      },
      {
        key: "announcement.rotate_speed_ms",
        value: values.rotateSpeedMs,
        type: "number",
        group_name: "announcement",
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
      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
        <div>
          <p className="text-sm font-medium">Announcement bar</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            The rotating strip shown at the very top of the storefront.
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

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Messages ({values.messages.length}/{MAX_MESSAGES})
          </label>
          {values.messages.length < MAX_MESSAGES && (
            <ActionButton icon={PlusIcon} label="Add message" onClick={addMessage} />
          )}
        </div>
        <div className="mt-2 flex flex-col gap-3">
          {values.messages.map((message, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-3"
            >
              <div className="flex items-center gap-2">
                <select
                  value={message.kind}
                  onChange={(e) =>
                    setMessage(index, { kind: e.target.value as AnnouncementMessageKind })
                  }
                  className={`${inputClass} flex-1`}
                >
                  {Object.entries(KIND_LABELS).map(([kind, label]) => (
                    <option key={kind} value={kind}>
                      {label}
                    </option>
                  ))}
                </select>
                <ActionButton
                  icon={TrashIcon}
                  label="Remove"
                  iconOnly
                  tone="danger"
                  onClick={() => removeMessage(index)}
                />
              </div>
              {message.kind === "delivery_in_zone" || message.kind === "delivery_outside_zone" ? (
                <p className="text-xs text-[var(--muted)]">
                  Live preview:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {previewText(message, inZoneRate, outsideZoneRate)}
                  </span>{" "}
                  — computed automatically, not editable here.
                </p>
              ) : (
                <input
                  type="text"
                  value={message.text ?? ""}
                  onChange={(e) => setMessage(index, { text: e.target.value })}
                  placeholder="Message text"
                  className={inputClass}
                />
              )}
            </div>
          ))}
          {values.messages.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No messages — the bar will be empty.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
          <p className="text-sm font-medium">Auto-rotate</p>
          <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={values.autoRotate}
              onChange={(e) => set("autoRotate", e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-black/15 transition-colors peer-checked:bg-[var(--color-success)]" />
            <span className="relative h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]" />
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Rotate speed (ms)</label>
          <input
            type="number"
            min={1000}
            step={500}
            value={values.rotateSpeedMs}
            onChange={(e) => set("rotateSpeedMs", Number(e.target.value))}
            disabled={!values.autoRotate}
            className={`${inputClass} disabled:opacity-40`}
          />
        </div>
      </div>

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
