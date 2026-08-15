"use client";

import { useActionState, useEffect } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  type ExpenseFormState,
} from "@/lib/admin/expenses-shared";
import type { ExpenseRow } from "@/lib/admin/expenses-query";

const inputClass =
  "rounded-[var(--radius-input)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Same useActionState + swap-in-place shape as components/admin/TagForm.tsx
// -- no new form pattern introduced.
export function ExpenseForm({
  expense,
  action,
  onSaved,
}: {
  expense: ExpenseRow | null;
  action: (state: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useEffect(() => {
    if (state && "success" in state) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Expense Name
        </label>
        <input id="name" name="name" type="text" required defaultValue={expense?.name ?? ""} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select id="category" name="category" required defaultValue={expense?.category ?? ""} className={inputClass}>
            <option value="" disabled>
              Select…
            </option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-medium">
            Amount (Rs)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={expense?.amount ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="expenseDate" className="text-sm font-medium">
            Date
          </label>
          <input
            id="expenseDate"
            name="expenseDate"
            type="date"
            required
            defaultValue={expense?.expenseDate ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="paymentMethod" className="text-sm font-medium">
            Payment Method
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            required
            defaultValue={expense?.paymentMethod ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select…
            </option>
            {EXPENSE_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {EXPENSE_PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-medium">
          Note (optional)
        </label>
        <textarea id="note" name="note" rows={2} defaultValue={expense?.note ?? ""} className={inputClass} />
      </div>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Expense"}
      </button>
    </form>
  );
}
