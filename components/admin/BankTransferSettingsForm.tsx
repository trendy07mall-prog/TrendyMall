"use client";

import { useActionState } from "react";
import { saveBankTransferSettings } from "@/lib/admin/paymentSettings";
import type { BankTransferSettings } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function BankTransferSettingsForm({ settings }: { settings: BankTransferSettings | null }) {
  const [state, formAction, pending] = useActionState(saveBankTransferSettings, undefined);

  return (
    <form action={formAction} className="mt-8 flex max-w-lg flex-col gap-4">
      <input type="hidden" name="id" defaultValue={settings?.id ?? ""} />

      <div className="flex flex-col gap-1">
        <label htmlFor="bankName" className="text-sm font-medium">
          Bank name
        </label>
        <input
          id="bankName"
          name="bankName"
          type="text"
          required
          defaultValue={settings?.bank_name ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="accountName" className="text-sm font-medium">
          Account name
        </label>
        <input
          id="accountName"
          name="accountName"
          type="text"
          required
          defaultValue={settings?.account_name ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="accountNumber" className="text-sm font-medium">
          Account number
        </label>
        <input
          id="accountNumber"
          name="accountNumber"
          type="text"
          required
          defaultValue={settings?.account_number ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="branch" className="text-sm font-medium">
          Branch
        </label>
        <input
          id="branch"
          name="branch"
          type="text"
          required
          defaultValue={settings?.branch ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="instructions" className="text-sm font-medium">
          Instructions (optional)
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={2}
          defaultValue={settings?.instructions ?? ""}
          placeholder="e.g. WhatsApp your slip to confirm faster."
          className={inputClass}
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
