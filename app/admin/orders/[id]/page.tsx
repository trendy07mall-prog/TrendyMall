import { cleanColorName } from "@/lib/variant-options";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { describeDeliveryFee } from "@/lib/delivery-fee";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { PaymentStatusBadge } from "@/components/order/PaymentStatusBadge";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { VerifyPaymentButton } from "@/components/admin/VerifyPaymentButton";
import { OrderActionPanel } from "@/components/admin/OrderActionPanel";
import { AddTrackingForm } from "@/components/admin/AddTrackingForm";
import { WhatsAppOrderLink } from "@/components/admin/WhatsAppOrderLink";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { getCachedGeneralSettings } from "@/lib/data/cached";
import { formatStoreDateTime } from "@/lib/datetime";
import { groupBundleRows } from "@/lib/orders/bundle-lines";
import { BundleContents } from "@/components/order/BundleContents";

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

  const [{ data: items }, { data: payment }, { data: address }, { data: history }, zones, general] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("payments").select("*").eq("order_id", id).maybeSingle(),
    supabase.from("shipping_addresses").select("*").eq("order_id", id).maybeSingle(),
    supabase
      .from("order_status_history")
      .select("new_value, note, created_at")
      .eq("order_id", id)
      .eq("field", "order_status")
      .order("created_at", { ascending: true }),
    getActiveDeliveryZones(),
    getCachedGeneralSettings(),
  ]);

  // The packer needs the SKU of the exact variant. order_items has no sku
  // column, so it's looked up live from the variant (a SKU almost never
  // changes once set -- same reasoning as lib/admin/orders-query.ts).
  const variantIds = [...new Set((items ?? []).map((i) => i.variant_id).filter((v): v is string => Boolean(v)))];
  const { data: variantSkus } =
    variantIds.length > 0
      ? await supabase.from("product_variants").select("id, sku").in("id", variantIds)
      : { data: [] as { id: string; sku: string | null }[] };
  const skuByVariantId = new Map((variantSkus ?? []).map((v) => [v.id, v.sku]));

  const deliveryLabel =
    order.delivery_method === "pickup"
      ? "Store Pickup"
      : address
        ? describeDeliveryFee(
            {
              district: address.district,
              postalCode: address.postal_code,
              zoneKey: address.zone_key,
              deliveryMethod: "standard",
            },
            zones,
          ).reason
        : null;

  let slipSignedUrl: string | null = null;
  if (payment?.slip_url) {
    const { data } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(payment.slip_url, 3600);
    slipSignedUrl = data?.signedUrl ?? null;
  }

  const showTracking = order.order_status !== "pending";

  return (
    <div>
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
        Placed {formatStoreDateTime(order.created_at)}
      </p>

      <div className="mt-6">
        <OrderTimeline
          whatsappNumber={general.whatsappNumber}
          status={order.order_status}
          failureReason={order.delivery_failure_reason}
          deliveryAttemptCount={order.delivery_attempt_count}
          statusHistory={(history ?? []).map((entry) => ({
            status: entry.new_value as typeof order.order_status,
            changedAt: entry.created_at,
            note: entry.note,
          }))}
          createdAt={order.created_at}
          orderNumber={order.order_number}
        />
      </div>

      <div className="mt-6">
        <OrderActionPanel
          orderId={order.id}
          orderStatus={order.order_status}
          paymentStatus={order.payment_status}
          paymentMethod={order.payment_method as "cod" | "bank_transfer" | "payhere"}
        />
      </div>

      <div className="mt-8 grid gap-1 text-sm text-[var(--muted)]">
        <p>{order.customer_name}</p>
        <p>{order.customer_email}</p>
        <p>{order.customer_phone}</p>
        <p className="whitespace-pre-line">{order.shipping_address}</p>
        {order.notes && <p>Notes: {order.notes}</p>}
      </div>

      <div className="mt-4">
        <WhatsAppOrderLink
          phone={order.customer_phone}
          orderNumber={order.order_number}
          orderStatus={order.order_status}
          customerName={order.customer_name}
        />
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

      {showTracking && (
        <div className="mt-6">
          <AddTrackingForm
            orderId={order.id}
            courier={order.courier}
            trackingNumber={order.tracking_number}
            trackingUrl={order.tracking_url}
          />
        </div>
      )}

      <ul className="mt-8 flex flex-col gap-3">
        {/* Bundle contents are indented under their bundle with no price.
            They are real order_items rows at Rs 0 -- that is how stock
            leaves per item and comes back on cancel -- but showing the
            zero here would read as "we gave this away". */}
        {groupBundleRows(items ?? []).map(({ line: item, contents }) => (
          <li key={item.id} className="border-b border-[var(--border)] pb-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-black/5">
                {item.product_image_url && (
                  <Image src={item.product_image_url} alt="" fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="flex flex-1 items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span>
                    {item.product_name} × {item.quantity}
                  </span>
                  {/* One chip per choice, so the packer reads exactly what
                      the customer picked. The colour text is cleaned:
                      older rows saved things like "White - 5000 mah". */}
                  {(cleanColorName(item.variant_name) ||
                    ((item.attribute_selections as { attributeName: string; value: string }[] | null)?.length ?? 0) > 0) && (
                    <span className="flex flex-wrap gap-1.5">
                      {cleanColorName(item.variant_name) && (
                        <span className="flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium">
                          {item.variant_color_hex && (
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 rounded-full border border-black/15"
                              style={{ backgroundColor: item.variant_color_hex }}
                            />
                          )}
                          Colour: {cleanColorName(item.variant_name)}
                        </span>
                      )}
                      {((item.attribute_selections as { attributeName: string; value: string }[] | null) ?? []).map(
                        (s) => (
                          <span
                            key={s.attributeName}
                            className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium"
                          >
                            {s.attributeName}: {s.value}
                          </span>
                        ),
                      )}
                    </span>
                  )}
                  {item.variant_id && skuByVariantId.get(item.variant_id) && (
                    <span className="font-mono text-xs text-[var(--muted)]">
                      SKU {skuByVariantId.get(item.variant_id)}
                    </span>
                  )}
                </div>
                <span className="shrink-0">{formatPrice(item.subtotal)}</span>
              </div>
            </div>
            <BundleContents
              className="ml-15"
              items={contents.map((c) => ({
                name: c.product_name,
                quantity: c.quantity,
                variantName: c.variant_name,
              }))}
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-[var(--muted)]">
          <span>Delivery{deliveryLabel ? ` (${deliveryLabel})` : ""}</span>
          <span>{order.delivery_method === "pickup" ? "Store Pickup" : formatPrice(order.shipping_fee)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <a
        href={`/invoices/${order.id}`}
        className="mt-8 inline-block rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
      >
        Download Invoice
      </a>
    </div>
  );
}
