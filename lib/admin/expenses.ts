"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, type ExpenseFormState } from "@/lib/admin/expenses-shared";

function revalidateExpensePaths() {
  revalidatePath("/admin/finance/expenses");
}

function readExpenseFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const amount = Number(amountRaw);
  const expenseDate = String(formData.get("expenseDate") ?? "");
  const paymentMethod = String(formData.get("paymentMethod") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  return { name, category, amount, amountRaw, expenseDate, paymentMethod, note };
}

function validateExpenseFields(fields: ReturnType<typeof readExpenseFields>): string | null {
  if (!fields.name) return "Name is required.";
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(fields.category)) return "Select a valid category.";
  if (!fields.amountRaw || Number.isNaN(fields.amount) || fields.amount < 0) {
    return "Enter a valid amount.";
  }
  if (!fields.expenseDate) return "Date is required.";
  if (!(EXPENSE_PAYMENT_METHODS as readonly string[]).includes(fields.paymentMethod)) {
    return "Select a valid payment method.";
  }
  return null;
}

// Purely additive bookkeeping -- this insert/update/delete set never
// touches the orders table (no foreign key exists between them at the
// schema level either, see sql/071_expenses.sql), so there is no code path
// here by which recording an expense could change an order amount.
export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const supabase = await requireAdminClient();
  const fields = readExpenseFields(formData);
  const validationError = validateExpenseFields(fields);
  if (validationError) return { error: validationError };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("expenses").insert({
    name: fields.name,
    category: fields.category,
    amount: fields.amount,
    expense_date: fields.expenseDate,
    payment_method: fields.paymentMethod,
    note: fields.note || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidateExpensePaths();
  return { success: true };
}

export async function updateExpense(
  expenseId: string,
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const supabase = await requireAdminClient();
  const fields = readExpenseFields(formData);
  const validationError = validateExpenseFields(fields);
  if (validationError) return { error: validationError };

  const { error } = await supabase
    .from("expenses")
    .update({
      name: fields.name,
      category: fields.category,
      amount: fields.amount,
      expense_date: fields.expenseDate,
      payment_method: fields.paymentMethod,
      note: fields.note || null,
    })
    .eq("id", expenseId);

  if (error) return { error: error.message };

  revalidateExpensePaths();
  return { success: true };
}

export async function deleteExpense(expenseId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) return { error: error.message };

  revalidateExpensePaths();
  return {};
}
