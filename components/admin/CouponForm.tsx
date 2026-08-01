"use client";

import { useActionState } from "react";
import { saveCoupon } from "@/lib/admin/coupons";
import type { Coupon } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function CouponForm({ coupon, onSaved }: { coupon: Coupon | null; onSaved?: () => void }) {
  const [state, formAction, pending] = useActionState(saveCoupon, undefined);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onSaved?.();
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="id" defaultValue={coupon?.id ?? ""} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="code" className="text-sm font-medium">
            Code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            defaultValue={coupon?.code ?? ""}
            placeholder="e.g. WELCOME10"
            className={`${inputClass} uppercase`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <select id="type" name="type" defaultValue={coupon?.type ?? "percentage"} className={inputClass}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
            <option value="free_shipping">Free shipping</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title (shown on the homepage and /coupons — optional)
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={coupon?.title ?? ""}
          placeholder="e.g. Welcome Offer"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description (shown on the homepage and /coupons — optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={coupon?.description ?? ""}
          placeholder="e.g. 10% off your first order"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="value" className="text-sm font-medium">
            Value (% or Rs — ignored for free shipping)
          </label>
          <input
            id="value"
            name="value"
            type="number"
            min="0"
            step="0.01"
            defaultValue={coupon?.value ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="minOrderValue" className="text-sm font-medium">
            Minimum order value (Rs)
          </label>
          <input
            id="minOrderValue"
            name="minOrderValue"
            type="number"
            min="0"
            step="0.01"
            defaultValue={coupon?.min_order_value ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="maxDiscountAmount" className="text-sm font-medium">
          Max discount cap (Rs — percentage coupons only, blank = uncapped)
        </label>
        <input
          id="maxDiscountAmount"
          name="maxDiscountAmount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={coupon?.max_discount_amount ?? ""}
          className={`${inputClass} max-w-[200px]`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="usageLimit" className="text-sm font-medium">
            Total usage limit (blank = unlimited)
          </label>
          <input
            id="usageLimit"
            name="usageLimit"
            type="number"
            min="1"
            defaultValue={coupon?.usage_limit ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="usageLimitPerCustomer" className="text-sm font-medium">
            Per-customer limit (blank = unlimited)
          </label>
          <input
            id="usageLimitPerCustomer"
            name="usageLimitPerCustomer"
            type="number"
            min="1"
            defaultValue={coupon?.usage_limit_per_customer ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="startsAt" className="text-sm font-medium">
            Starts (optional)
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="date"
            defaultValue={toDateInputValue(coupon?.starts_at ?? null)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="expiresAt" className="text-sm font-medium">
            Expires (optional)
          </label>
          <input
            id="expiresAt"
            name="expiresAt"
            type="date"
            defaultValue={toDateInputValue(coupon?.expires_at ?? null)}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={coupon?.is_active ?? true} />
        Active
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Coupon"}
      </button>
    </form>
  );
}
