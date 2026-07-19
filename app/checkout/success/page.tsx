import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  if (!orderId) notFound();

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Thank you — order placed
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Order #{order.id.slice(0, 8)} is saved as{" "}
        <strong>pending payment</strong>. We&apos;ll follow up on payment and
        shipping details shortly.
      </p>

      <ul className="mt-8 flex flex-col gap-3 text-left">
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

      <Link href="/account/orders" className="mt-10 inline-block underline">
        View order history
      </Link>
    </div>
  );
}
