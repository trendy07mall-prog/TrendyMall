import type { Metadata } from "next";
import { getMyOrders, ACCOUNT_ORDERS_PAGE_SIZE } from "@/lib/account/orders-query";
import { parseAccountOrderFilterState } from "@/lib/account/order-filters";
import { OrderSearchBar } from "@/components/account/OrderSearchBar";
import { OrderFilterTabs } from "@/components/account/OrderFilterTabs";
import { OrdersList } from "@/components/account/OrdersList";

export const metadata: Metadata = { title: "Your orders — TrendyMall" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAccountOrderFilterState(sp);
  const requestedPage = Number(sp.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const { orders, totalCount } = await getMyOrders(filters, page, ACCOUNT_ORDERS_PAGE_SIZE);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Your orders</h1>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <OrderFilterTabs basePath="/account/orders" state={filters} />
        <OrderSearchBar basePath="/account/orders" state={filters} />
      </div>

      <OrdersList
        orders={orders}
        totalCount={totalCount}
        page={page}
        pageSize={ACCOUNT_ORDERS_PAGE_SIZE}
        basePath="/account/orders"
        searchParams={sp}
        filters={filters}
      />
    </div>
  );
}
