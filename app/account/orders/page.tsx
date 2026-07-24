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
      <h1 className="font-heading text-2xl font-bold tracking-tight">Your orders</h1>

      {!orders || orders.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">
          You haven&apos;t placed any orders yet.{" "}
          <Link href="/shop" className="underline">
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
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3 text-sm transition-colors hover:bg-black/5"
              >
                <span>
                  Order {order.order_number} —{" "}
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
