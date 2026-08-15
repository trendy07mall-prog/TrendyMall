import { createClient } from "@/lib/supabase/server";
import type { FinanceRangeWindow } from "@/lib/admin/finance-shared";
import type { ExpenseCategory, ExpensePaymentMethod } from "@/lib/admin/expenses-shared";

export interface ExpenseRow {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  note: string | null;
}

export interface ExpensesPage {
  expenses: ExpenseRow[];
  totalCount: number;
  totalAmount: number;
}

export const EXPENSES_PAGE_SIZE = 20;

// Filtered by the same shared Finance date range every other tab reads
// (on expense_date, the date the cost was actually incurred) -- keeps the
// whole Finance section scoped consistently, per the dataviz interaction
// convention this section already follows elsewhere ("filters scope
// everything below them").
export async function getExpensesPage(
  window: FinanceRangeWindow,
  page = 1,
  pageSize = EXPENSES_PAGE_SIZE,
): Promise<ExpensesPage> {
  const supabase = await createClient();

  const fromDate = window.from.toISOString().slice(0, 10);
  const toDate = window.to.toISOString().slice(0, 10);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [{ data, count, error }, { data: allInRange }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, name, category, amount, expense_date, payment_method, note", { count: "exact" })
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate)
      .order("expense_date", { ascending: false })
      .range(from, to),
    supabase.from("expenses").select("amount").gte("expense_date", fromDate).lte("expense_date", toDate),
  ]);

  if (error || !data) return { expenses: [], totalCount: 0, totalAmount: 0 };

  const expenses: ExpenseRow[] = data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as ExpenseCategory,
    amount: row.amount,
    expenseDate: row.expense_date,
    paymentMethod: row.payment_method as ExpensePaymentMethod,
    note: row.note,
  }));

  const totalAmount = (allInRange ?? []).reduce((sum, e) => sum + e.amount, 0);

  return { expenses, totalCount: count ?? 0, totalAmount };
}
