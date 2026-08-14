"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { StatusIndicator } from "@/components/admin/settings/StatusIndicator";
import type { ShippingSettings } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

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

// Free Shipping composes into the EXISTING coupon/campaign shipping-waiver
// chain (app/cart/page.tsx, CheckoutForm.tsx, create_order_atomic) as a
// third OR-condition -- never double-waives alongside a free-shipping
// coupon or an active free-shipping campaign. Store Pickup fields feed
// the real checkout pickup option and new pickup orders' stored address;
// past pickup orders are unaffected (their address was frozen at order
// time).
export function ShippingSettingsForm({ initial }: { initial: ShippingSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof ShippingSettings>(key: K, value: ShippingSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      {
        key: "shipping.free_shipping_enabled",
        value: values.freeShippingEnabled,
        type: "boolean",
        group_name: "shipping",
      },
      {
        key: "shipping.free_shipping_min_amount",
        value: values.freeShippingMinAmount,
        type: "number",
        group_name: "shipping",
      },
      {
        key: "shipping.pickup_enabled",
        value: values.pickupEnabled,
        type: "boolean",
        group_name: "shipping",
      },
      { key: "shipping.pickup_name", value: values.pickupName, type: "string", group_name: "shipping" },
      {
        key: "shipping.pickup_address",
        value: values.pickupAddress,
        type: "string",
        group_name: "shipping",
      },
      {
        key: "shipping.pickup_instructions",
        value: values.pickupInstructions,
        type: "string",
        group_name: "shipping",
      },
      {
        key: "shipping.pickup_hours",
        value: values.pickupHours,
        type: "string",
        group_name: "shipping",
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
      <h3 className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        Free Shipping
      </h3>
      <ToggleRow
        label="Free shipping over a minimum order"
        hint="Waives the delivery fee once the cart subtotal reaches the amount below. Composes with (never doubles up against) free-shipping coupons or active free-shipping campaigns."
        checked={values.freeShippingEnabled}
        onChange={(checked) => set("freeShippingEnabled", checked)}
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Minimum order amount (LKR)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={values.freeShippingMinAmount}
          onChange={(e) => set("freeShippingMinAmount", Number(e.target.value))}
          disabled={!values.freeShippingEnabled}
          className={`${inputClass} max-w-48 disabled:opacity-40`}
        />
      </div>

      <h3 className="mt-4 text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        Store Pickup
      </h3>
      <ToggleRow
        label="Store Pickup"
        hint="Offer free in-store pickup as a delivery option at checkout."
        checked={values.pickupEnabled}
        onChange={(checked) => set("pickupEnabled", checked)}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Location name</label>
          <input
            type="text"
            value={values.pickupName}
            onChange={(e) => set("pickupName", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Pickup hours</label>
          <input
            type="text"
            value={values.pickupHours}
            onChange={(e) => set("pickupHours", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Address</label>
        <textarea
          rows={2}
          value={values.pickupAddress}
          onChange={(e) => set("pickupAddress", e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Instructions (optional)</label>
        <textarea
          rows={2}
          value={values.pickupInstructions}
          onChange={(e) => set("pickupInstructions", e.target.value)}
          placeholder="e.g. Ask for the online orders counter."
          className={inputClass}
        />
      </div>

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
