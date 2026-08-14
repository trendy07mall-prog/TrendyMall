"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { StatusIndicator } from "@/components/admin/settings/StatusIndicator";
import type { PaymentSettings } from "@/lib/data/settings";

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

// Controls the exact same PaymentMethodCard disabled/comingSoon gating
// PayHere's card already used before this phase (CheckoutForm.tsx) --
// COD/Bank Transfer had zero existing toggle (confirmed via audit), this
// is genuinely new capability using an established visual pattern, not a
// new one. onlinePaymentEnabled is ANDed with the real isPayHereEnabled()
// env check downstream (in CheckoutForm.tsx) -- it can only ever narrow
// availability, never grant it without real merchant credentials.
export function PaymentSettingsForm({
  initial,
  payHereConfigured,
}: {
  initial: PaymentSettings;
  // Whether PAYHERE_MERCHANT_ID/SECRET are actually set server-side --
  // informational only, shown so an admin doesn't turn "Online Payment"
  // on and wonder why it's still unavailable at checkout.
  payHereConfigured: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    if (!values.codEnabled && !values.bankTransferEnabled && !values.onlinePaymentEnabled) {
      setStatus("error");
      setErrorMessage("At least one payment method must stay enabled — the store can't have zero ways to pay.");
      return;
    }

    setStatus("saving");
    const result = await updateSettings([
      { key: "payment.cod_enabled", value: values.codEnabled, type: "boolean", group_name: "payment" },
      {
        key: "payment.bank_transfer_enabled",
        value: values.bankTransferEnabled,
        type: "boolean",
        group_name: "payment",
      },
      {
        key: "payment.online_payment_enabled",
        value: values.onlinePaymentEnabled,
        type: "boolean",
        group_name: "payment",
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
      <ToggleRow
        label="Cash on Delivery"
        hint="Pay in cash when the order arrives."
        checked={values.codEnabled}
        onChange={(checked) => set("codEnabled", checked)}
      />
      <ToggleRow
        label="Bank Transfer"
        hint="Customer transfers to your account and uploads a slip or reference."
        checked={values.bankTransferEnabled}
        onChange={(checked) => set("bankTransferEnabled", checked)}
      />
      <ToggleRow
        label={`Online Payment (PayHere)${payHereConfigured ? "" : " — not configured"}`}
        hint={
          payHereConfigured
            ? "Card payments via PayHere."
            : "Card payments via PayHere. PAYHERE_MERCHANT_ID/SECRET aren't set, so this stays unavailable at checkout regardless of this toggle."
        }
        checked={values.onlinePaymentEnabled}
        onChange={(checked) => set("onlinePaymentEnabled", checked)}
      />

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
