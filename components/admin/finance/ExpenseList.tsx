"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExpenseForm } from "@/components/admin/finance/ExpenseForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import { createExpense, updateExpense, deleteExpense } from "@/lib/admin/expenses";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_PAYMENT_METHOD_LABELS } from "@/lib/admin/expenses-shared";
import { Pagination } from "@/components/product/Pagination";
import { formatPrice } from "@/lib/utils";
import type { ExpenseRow } from "@/lib/admin/expenses-query";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Same swap-in-place list/form shape as components/admin/TagList.tsx --
// reuses ConfirmDialog and useToast directly, no new list pattern.
export function ExpenseList({
  expenses,
  totalCount,
  totalAmount,
  page,
  pageSize,
  basePath,
  searchParams,
}: {
  expenses: ExpenseRow[];
  totalCount: number;
  totalAmount: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [editing, setEditing] = useState<ExpenseRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteExpense(deleting.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Expense deleted");
        router.refresh();
      }
      setDeleting(null);
    });
  }

  if (editing !== null) {
    const editingExpense = editing === "new" ? null : editing;
    return (
      <div>
        <button type="button" onClick={() => setEditing(null)} className="mb-4 text-sm text-[var(--muted)] underline">
          ← Back to expenses
        </button>
        <ExpenseForm
          expense={editingExpense}
          action={editingExpense ? updateExpense.bind(null, editingExpense.id) : createExpense}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">Total for this period</p>
          <p className="text-xl font-semibold">{formatPrice(totalAmount)}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
        >
          + Add Expense
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-black/[0.02] text-left text-xs text-[var(--color-text-secondary)]">
              <th className="px-3 py-2.5 font-medium">Expense</th>
              <th className="px-3 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Payment Method</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2.5 align-top">
                  <p className="font-medium">{expense.name}</p>
                  {expense.note && <p className="mt-0.5 text-xs text-[var(--muted)]">{expense.note}</p>}
                </td>
                <td className="px-3 py-2.5 align-top text-[var(--color-text-secondary)]">
                  {EXPENSE_CATEGORY_LABELS[expense.category]}
                </td>
                <td className="px-3 py-2.5 align-top whitespace-nowrap text-[var(--color-text-secondary)]">
                  {formatDate(expense.expenseDate)}
                </td>
                <td className="px-3 py-2.5 align-top text-[var(--color-text-secondary)]">
                  {EXPENSE_PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                </td>
                <td className="px-3 py-2.5 text-right align-top font-medium [font-variant-numeric:tabular-nums]">
                  {formatPrice(expense.amount)}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setEditing(expense)} className="text-xs underline">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(expense)}
                      className="text-xs text-[var(--color-discount)] underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--muted)]">
                  No expenses recorded for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath={basePath} currentPage={page} totalPages={totalPages} searchParams={searchParams} />

      {deleting && (
        <ConfirmDialog
          title="Delete expense?"
          message={`Are you sure you want to delete "${deleting.name}"? This can't be undone.`}
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
