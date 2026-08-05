import { getAdminOrders, getAdminOrderStatusCounts, ADMIN_ORDERS_PAGE_SIZE } from "@/lib/admin/orders-query";
import { parseAdminOrderFilterState } from "@/lib/admin/order-filters";
import { OrderSearchBar } from "@/components/admin/OrderSearchBar";
import { OrderFilterBar } from "@/components/admin/OrderFilterBar";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { OrderSummaryCards } from "@/components/admin/OrderSummaryCards";
import { OrderStatusTabs } from "@/components/admin/OrderStatusTabs";
import { OrderNewOrdersBanner } from "@/components/admin/OrderNewOrdersBanner";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const state = parseAdminOrderFilterState(sp);
  const requestedPage = Number(sp.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [{ orders, totalCount }, counts] = await Promise.all([
    getAdminOrders(state, page, ADMIN_ORDERS_PAGE_SIZE),
    getAdminOrderStatusCounts(),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Orders</h1>

      <div className="mt-4">
        <OrderNewOrdersBanner count={counts.new} />
      </div>

      <div className="mt-6">
        <OrderSummaryCards counts={counts} />
      </div>

      <div className="mt-6">
        <OrderStatusTabs basePath="/admin/orders" state={state} counts={counts} />
      </div>

      <div className="sticky top-0 z-10 mt-4 flex flex-col gap-4 bg-[var(--background)] py-3">
        <OrderSearchBar basePath="/admin/orders" state={state} />
        <OrderFilterBar basePath="/admin/orders" state={state} />
      </div>

      <div className="mt-2">
        <OrdersTable
          orders={orders}
          totalCount={totalCount}
          page={page}
          pageSize={ADMIN_ORDERS_PAGE_SIZE}
          basePath="/admin/orders"
          searchParams={sp}
          tab={state.tab}
        />
      </div>
    </div>
  );
}
