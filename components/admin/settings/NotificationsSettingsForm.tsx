"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { StatusIndicator } from "@/components/admin/settings/StatusIndicator";
import type { NotificationSettings } from "@/lib/data/settings";

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusIndicator active={checked} />
        <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full bg-black/15 transition-colors peer-checked:bg-[var(--color-success)]" />
          <span className="relative h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]" />
        </label>
      </div>
    </div>
  );
}

const FIELDS: { key: keyof NotificationSettings; settingKey: string; label: string; hint: string }[] = [
  {
    key: "newOrderEnabled",
    settingKey: "notifications.new_order_enabled",
    label: "New order",
    hint: "Email you a copy of every order confirmation. Customer confirmation emails are unaffected either way.",
  },
  {
    key: "newReviewEnabled",
    settingKey: "notifications.new_review_enabled",
    label: "New review",
    hint: "Email you when a customer submits a product review.",
  },
  {
    key: "newSubscriberEnabled",
    settingKey: "notifications.new_subscriber_enabled",
    label: "New subscriber",
    hint: "Email you when someone joins the newsletter.",
  },
  {
    key: "lowStockEnabled",
    settingKey: "notifications.low_stock_enabled",
    label: "Low stock",
    hint: "Email you when an order drops a product's stock below 5.",
  },
  {
    key: "paymentReceivedEnabled",
    settingKey: "notifications.payment_received_enabled",
    label: "Payment received",
    hint: "Email you when a bank transfer, card payment, or COD order is marked paid.",
  },
  {
    key: "campaignEndingEnabled",
    settingKey: "notifications.campaign_ending_enabled",
    label: "Campaign ending soon",
    hint: "Daily check for campaigns ending within 24 hours, emailed once per campaign.",
  },
];

// Every toggle here gates only the store owner's own copy of a
// notification -- no customer-facing email is ever affected by anything
// on this page.
export function NotificationsSettingsForm({ initial }: { initial: NotificationSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set(key: keyof NotificationSettings, value: boolean) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings(
      FIELDS.map((field) => ({
        key: field.settingKey,
        value: values[field.key],
        type: "boolean" as const,
        group_name: "notifications",
      })),
    );
    if (result.error) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    setStatus("saved");
  }

  return (
    <div className="flex flex-col gap-4">
      {FIELDS.map((field) => (
        <ToggleRow
          key={field.key}
          label={field.label}
          hint={field.hint}
          checked={values[field.key]}
          onChange={(checked) => set(field.key, checked)}
        />
      ))}

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
