"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CommissionRuleForm } from "@/components/admin/finance/CommissionRuleForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import { createCommissionRule, updateCommissionRule, deleteCommissionRule } from "@/lib/admin/commission-rules";
import type { CategoryOption, CommissionRuleRow } from "@/lib/admin/commission-rules-query";

// Same swap-in-place list/form shape as components/admin/TagList.tsx and
// components/admin/finance/ExpenseList.tsx.
export function CommissionCategoryRules({
  rules,
  categories,
}: {
  rules: CommissionRuleRow[];
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState<CommissionRuleRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<CommissionRuleRow | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteCommissionRule(deleting.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Rule deleted");
        router.refresh();
      }
      setDeleting(null);
    });
  }

  if (editing !== null) {
    const editingRule = editing === "new" ? null : editing;
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
        <button type="button" onClick={() => setEditing(null)} className="mb-4 text-sm text-[var(--muted)] underline">
          ← Back to rules
        </button>
        <CommissionRuleForm
          rule={editingRule}
          categories={categories}
          action={editingRule ? updateCommissionRule.bind(null, editingRule.id) : createCommissionRule}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
          Per-Category Commission Rules
        </p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
        >
          + Add Category Rule
        </button>
      </div>

      <div className="mt-3 flex flex-col">
        {rules.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            No category rules yet — the default commission percentage above applies to every category.
          </p>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-2 border-b border-[var(--border)] py-2.5 last:border-0"
            >
              <span className="flex-1 text-sm font-medium">{rule.categoryName}</span>
              <span className="text-sm [font-variant-numeric:tabular-nums]">{rule.commissionPercent}%</span>
              <div className="ml-4 flex items-center gap-3">
                <button type="button" onClick={() => setEditing(rule)} className="text-xs underline">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(rule)}
                  className="text-xs text-[var(--color-discount)] underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete commission rule?"
          message={`Are you sure you want to delete the rule for "${deleting.categoryName}"? This can't be undone.`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
