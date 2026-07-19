import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { StatusBadge } from "@/components/order/StatusBadge";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black text-left dark:border-white">
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((order) => (
              <tr
                key={order.id}
                className="border-b border-zinc-200 dark:border-zinc-800"
              >
                <td className="py-2 pr-4">#{order.id.slice(0, 8)}</td>
                <td className="py-2 pr-4">{order.customer_name}</td>
                <td className="py-2 pr-4">{formatPrice(order.total)}</td>
                <td className="py-2 pr-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-2">
                  <Link href={`/admin/orders/${order.id}`} className="underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
