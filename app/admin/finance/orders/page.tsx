import { FinanceOrdersFilters } from "@/components/admin/finance/FinanceOrdersFilters";
import { FinanceOrdersTable } from "@/components/admin/finance/FinanceOrdersTable";
import {
  getFinanceOrdersPage,
  resolveFinanceRangeWindow,
  FINANCE_ORDERS_PAGE_SIZE,
} from "@/lib/admin/finance-query";
import { parseFinanceRangeState, parseFinanceOrderFilterState } from "@/lib/admin/finance-filters";

export default async function AdminFinanceOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rangeState = parseFinanceRangeState(sp);
  const filters = parseFinanceOrderFilterState(sp);
  const window = resolveFinanceRangeWindow(rangeState.range, rangeState.customFrom, rangeState.customTo);

  const requestedPage = Number(sp.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const { orders, totalCount } = await getFinanceOrdersPage(window, filters, page, FINANCE_ORDERS_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <FinanceOrdersFilters rangeState={rangeState} filters={filters} />
      <FinanceOrdersTable
        orders={orders}
        totalCount={totalCount}
        page={page}
        pageSize={FINANCE_ORDERS_PAGE_SIZE}
        basePath="/admin/finance/orders"
        searchParams={sp}
      />
    </div>
  );
}
