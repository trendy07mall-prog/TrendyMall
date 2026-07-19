import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { StatusBadge } from "@/components/order/StatusBadge";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          Order #{order.id.slice(0, 8)}
        </h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Placed {new Date(order.created_at).toLocaleString()}
      </p>

      <div className="mt-8 grid gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        <p>{order.customer_name}</p>
        <p>{order.customer_email}</p>
        <p>{order.customer_phone}</p>
        <p className="whitespace-pre-line">{order.shipping_address}</p>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {(items ?? []).map((item) => (
          <li
            key={item.id}
            className="flex justify-between border-b border-zinc-200 pb-2 text-sm dark:border-zinc-800"
          >
            <span>
              {item.product_name} × {item.quantity}
            </span>
            <span>{formatPrice(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between text-sm font-medium">
        <span>Total</span>
        <span>{formatPrice(order.total)}</span>
      </div>
    </div>
  );
}
