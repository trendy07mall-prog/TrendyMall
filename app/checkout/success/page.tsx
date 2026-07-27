import Link from "next/link";
import Image from "next/image";
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
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Thank you — order placed
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Order <strong>{order.order_number}</strong> is saved as{" "}
        <strong>pending payment</strong>. We&apos;ll follow up on payment and
        shipping details shortly.
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Save your order number — you can check its status anytime at{" "}
        <Link href="/track-order" className="underline">
          Track Order
        </Link>{" "}
        using this number and your phone number.
      </p>

      <ul className="mt-8 flex flex-col gap-3 text-left">
        {(items ?? []).map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 border-b border-[var(--border)] pb-3 text-sm"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-black/5">
              {item.product_image_url && (
                <Image src={item.product_image_url} alt="" fill sizes="48px" className="object-cover" />
              )}
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <span>{formatPrice(item.subtotal)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-[var(--muted)]">
          <span>Delivery</span>
          <span>{formatPrice(order.shipping_fee)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <Link href="/account/orders" className="mt-10 inline-block underline">
        View order history
      </Link>
    </div>
  );
}
