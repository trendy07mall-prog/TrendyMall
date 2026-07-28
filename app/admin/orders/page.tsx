import { getAdminOrders, ADMIN_ORDERS_PAGE_SIZE } from "@/lib/admin/orders-query";
import { parseAdminOrderFilterState } from "@/lib/admin/order-filters";
import { OrderSearchBar } from "@/components/admin/OrderSearchBar";
import { OrderFilterBar } from "@/components/admin/OrderFilterBar";
import { OrdersTable } from "@/components/admin/OrdersTable";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const state = parseAdminOrderFilterState(sp);
  const requestedPage = Number(sp.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const { orders, totalCount } = await getAdminOrders(state, page, ADMIN_ORDERS_PAGE_SIZE);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Orders</h1>

      <div className="mt-6 flex flex-col gap-4">
        <OrderSearchBar basePath="/admin/orders" state={state} />
        <OrderFilterBar basePath="/admin/orders" state={state} />
      </div>

      <div className="mt-6">
        <OrdersTable
          orders={orders}
          totalCount={totalCount}
          page={page}
          pageSize={ADMIN_ORDERS_PAGE_SIZE}
          basePath="/admin/orders"
          searchParams={sp}
        />
      </div>
    </div>
  );
}
