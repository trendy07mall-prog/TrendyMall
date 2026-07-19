import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { StatusBadge } from "@/components/order/StatusBadge";

export const metadata: Metadata = { title: "Your orders — TrendyMall" };

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>

      {!orders || orders.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">
          You haven&apos;t placed any orders yet.{" "}
          <Link href="/" className="underline">
            Start shopping
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="flex items-center justify-between border border-black px-4 py-3 text-sm transition-colors hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
              >
                <span>
                  Order #{order.id.slice(0, 8)} —{" "}
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-4">
                  <StatusBadge status={order.status} />
                  {formatPrice(order.total)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
