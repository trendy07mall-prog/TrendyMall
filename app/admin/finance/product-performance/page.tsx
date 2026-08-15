import { ProductPerformanceTable } from "@/components/admin/finance/ProductPerformanceTable";
import { getProductPerformance, resolveFinanceRangeWindow } from "@/lib/admin/finance-query";
import { parseFinanceRangeState } from "@/lib/admin/finance-filters";

export default async function AdminFinanceProductPerformancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rangeState = parseFinanceRangeState(sp);
  const window = resolveFinanceRangeWindow(rangeState.range, rangeState.customFrom, rangeState.customTo);

  const sortBy = sp.sort === "units" ? "units" : "sales";
  const rows = await getProductPerformance(window, sortBy);

  return (
    <ProductPerformanceTable rows={rows} sortBy={sortBy} basePath="/admin/finance/product-performance" searchParams={sp} />
  );
}
