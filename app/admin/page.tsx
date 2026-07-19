import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: productCount }, { count: pendingOrders }, { data: lowStock }] =
    await Promise.all([
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
    ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="mt-8 grid grid-cols-2 gap-px bg-black sm:grid-cols-3 dark:bg-white">
        <StatTile label="Products" value={productCount ?? 0} />
        <StatTile label="Pending payment orders" value={pendingOrders ?? 0} />
        <StatTile label="Low stock (<5)" value={lowStock?.length ?? 0} />
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium">Low stock</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {lowStock.map((product) => (
              <li
                key={product.id}
                className="flex justify-between border-b border-zinc-200 pb-2 text-sm dark:border-zinc-800"
              >
                <span>{product.name}</span>
                <span>{product.stock} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white px-6 py-8 dark:bg-black">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}
