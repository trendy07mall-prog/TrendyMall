import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { VerifyPaymentButton } from "@/components/admin/VerifyPaymentButton";

export default async function AdminOrderDetailPage({
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

  const [{ data: items }, { data: payment }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("payments").select("*").eq("order_id", id).maybeSingle(),
  ]);

  let slipSignedUrl: string | null = null;
  if (payment?.slip_url) {
    const { data } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(payment.slip_url, 3600);
    slipSignedUrl = data?.signedUrl ?? null;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold tracking-tight">
          Order {order.order_number}
        </h1>
        <OrderStatusSelect orderId={order.id} status={order.status} />
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Placed {new Date(order.created_at).toLocaleString()}
      </p>

      <div className="mt-8 grid gap-1 text-sm text-[var(--muted)]">
        <p>{order.customer_name}</p>
        <p>{order.customer_email}</p>
        <p>{order.customer_phone}</p>
        <p className="whitespace-pre-line">{order.shipping_address}</p>
      </div>

      {payment && payment.gateway === "bank_transfer" && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3 text-sm">
          <p className="font-medium">Bank transfer payment</p>
          {payment.reference_number && (
            <p className="mt-1 text-[var(--muted)]">Reference: {payment.reference_number}</p>
          )}
          {slipSignedUrl && (
            <a
              href={slipSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block underline"
            >
              View uploaded slip
            </a>
          )}
          {payment.status === "awaiting_verification" && (
            <div className="mt-3">
              <VerifyPaymentButton orderId={order.id} />
            </div>
          )}
        </div>
      )}

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
          <span>{formatPrice(order.shipping_fee)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  );
}
