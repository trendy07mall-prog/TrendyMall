import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/order/PaymentStatusBadge";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";

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

  const [{ data: items }, { data: shippingAddress }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("shipping_addresses").select("*").eq("order_id", id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold tracking-tight">
          Order {order.order_number}
        </h1>
        <div className="flex items-center gap-2">
          <PaymentStatusBadge status={order.payment_status} />
          <OrderStatusBadge status={order.order_status} />
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Placed {new Date(order.created_at).toLocaleString()}
      </p>

      <div className="mt-8 grid gap-1 text-sm text-[var(--muted)]">
        <p>{order.customer_name}</p>
        <p>{order.customer_email}</p>
        <p>{order.customer_phone}</p>
        {order.delivery_method === "pickup" ? (
          <p>Store Pickup — {order.shipping_address}</p>
        ) : shippingAddress ? (
          <p>
            {shippingAddress.street}, {shippingAddress.city}, {shippingAddress.district}
            {shippingAddress.postal_code ? ` ${shippingAddress.postal_code}` : ""}
          </p>
        ) : (
          <p className="whitespace-pre-line">{order.shipping_address}</p>
        )}
        {order.notes && <p>Notes: {order.notes}</p>}
      </div>

      <ul className="mt-8 flex flex-col gap-3">
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
          <span>
            {order.delivery_method === "pickup" ? "Store Pickup" : formatPrice(order.shipping_fee)}
          </span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {(order.courier || order.tracking_number || order.tracking_url) && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3 text-sm">
          <p className="font-medium">Tracking</p>
          {order.courier && <p className="mt-1 text-[var(--muted)]">Courier: {order.courier}</p>}
          {order.tracking_number && (
            <p className="text-[var(--muted)]">Tracking number: {order.tracking_number}</p>
          )}
          {order.tracking_url && (
            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="underline">
              Track shipment
            </a>
          )}
        </div>
      )}
    </div>
  );
}
