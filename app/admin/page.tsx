import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { count: productCount },
    { count: pendingOrders },
    { data: lowStock },
    { data: revenueOrders },
    { count: ordersThisMonth },
    { data: orderItems },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_payment"),
    supabase
      .from("products")
      .select("id, name, stock")
      .lt("stock", 5)
      .order("stock", { ascending: true }),
    supabase
      .from("orders")
      .select("total")
      .in("status", ["confirmed", "shipped", "delivered"]),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
    supabase.from("order_items").select("product_name, quantity"),
  ]);

  const totalRevenue = (revenueOrders ?? []).reduce((sum, o) => sum + o.total, 0);

  const salesByProduct = new Map<string, number>();
  for (const item of orderItems ?? []) {
    salesByProduct.set(
      item.product_name,
      (salesByProduct.get(item.product_name) ?? 0) + item.quantity,
    );
  }
  const bestSellers = [...salesByProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
        <StatTile label="Total revenue" value={formatPrice(totalRevenue)} />
        <StatTile label="Orders this month" value={ordersThisMonth ?? 0} />
        <StatTile label="Pending payment orders" value={pendingOrders ?? 0} />
        <StatTile label="Products" value={productCount ?? 0} />
        <StatTile label="Low stock (<5)" value={lowStock?.length ?? 0} />
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {bestSellers.length > 0 && (
          <div>
            <h2 className="text-lg font-medium">Best sellers</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {bestSellers.map(([name, quantity]) => (
                <li
                  key={name}
                  className="flex justify-between border-b border-[var(--border)] pb-2 text-sm"
                >
                  <span>{name}</span>
                  <span>{quantity} sold</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lowStock && lowStock.length > 0 && (
          <div>
            <h2 className="text-lg font-medium">Low stock</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {lowStock.map((product) => (
                <li
                  key={product.id}
                  className="flex justify-between border-b border-[var(--border)] pb-2 text-sm"
                >
                  <span>{product.name}</span>
                  <span>{product.stock} left</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white px-6 py-8">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
