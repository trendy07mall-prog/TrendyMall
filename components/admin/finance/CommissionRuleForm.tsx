"use client";

import { useActionState, useEffect } from "react";
import type { CommissionRuleFormState } from "@/lib/admin/commission-rules";
import type { CategoryOption, CommissionRuleRow } from "@/lib/admin/commission-rules-query";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Same useActionState + swap-in-place shape as components/admin/TagForm.tsx
// and components/admin/finance/ExpenseForm.tsx.
export function CommissionRuleForm({
  rule,
  categories,
  action,
  onSaved,
}: {
  rule: CommissionRuleRow | null;
  categories: CategoryOption[];
  action: (state: CommissionRuleFormState, formData: FormData) => Promise<CommissionRuleFormState>;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useEffect(() => {
    if (state && "success" in state) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="categoryId" className="text-sm font-medium">
          Category
        </label>
        <select id="categoryId" name="categoryId" required defaultValue={rule?.categoryId ?? ""} className={inputClass}>
          <option value="" disabled>
            Select…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="commissionPercent" className="text-sm font-medium">
          Commission (%)
        </label>
        <input
          id="commissionPercent"
          name="commissionPercent"
          type="number"
          min="0"
          max="100"
          step="0.1"
          required
          defaultValue={rule?.commissionPercent ?? ""}
          className={inputClass}
        />
      </div>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Rule"}
      </button>
    </form>
  );
}
