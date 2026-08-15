import { ExpenseList } from "@/components/admin/finance/ExpenseList";
import { getExpensesPage, EXPENSES_PAGE_SIZE } from "@/lib/admin/expenses-query";
import { resolveFinanceRangeWindow } from "@/lib/admin/finance-query";
import { parseFinanceRangeState } from "@/lib/admin/finance-filters";

export default async function AdminFinanceExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rangeState = parseFinanceRangeState(sp);
  const window = resolveFinanceRangeWindow(rangeState.range, rangeState.customFrom, rangeState.customTo);

  const requestedPage = Number(sp.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const { expenses, totalCount, totalAmount } = await getExpensesPage(window, page, EXPENSES_PAGE_SIZE);

  return (
    <ExpenseList
      expenses={expenses}
      totalCount={totalCount}
      totalAmount={totalAmount}
      page={page}
      pageSize={EXPENSES_PAGE_SIZE}
      basePath="/admin/finance/expenses"
      searchParams={sp}
    />
  );
}
