-- New /order-confirmation/[orderNumber] route (replaces /checkout/success
-- ?orderId=) needs a single lookup that works for both a logged-in owner
-- and a guest holding an unguessable token, so access control lives in
-- exactly one place instead of the old page's two separate branches.
--
-- order_number alone is guessable/sequential (TM-2026-00021, ...) — it is
-- NOT sufficient to authorize access on its own. A logged-in customer is
-- authorized the normal way (auth.uid() = orders.user_id). A guest has no
-- session, so they must also present p_token matching the order's own id
-- — a real UUID, unguessable, same reasoning already used for
-- get_guest_order_by_id (sql/033): narrow, single-row-scoped, so it can
-- never become an enumeration surface no matter what else calls it.
--
-- Reuses the same jsonb shape as get_guest_order_by_id/track_order (adds
-- isGuest so the page knows whether to show the "Create an account?"
-- prompt) — new function, no existing one changes shape, so no DROP
-- FUNCTION needed here.
create or replace function public.get_order_confirmation(p_order_number text, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_result jsonb;
begin
  select * into v_order from public.orders where order_number = p_order_number;
  if v_order.id is null then
    return null;
  end if;

  if not (
    (auth.uid() is not null and v_order.user_id = auth.uid())
    or (p_token is not null and p_token = v_order.id)
  ) then
    return null;
  end if;

  select jsonb_build_object(
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'isGuest', v_order.user_id is null,
    'customerName', v_order.customer_name,
    'customerEmail', v_order.customer_email,
    'customerPhone', v_order.customer_phone,
    'paymentStatus', v_order.payment_status,
    'orderStatus', v_order.order_status,
    'paymentMethod', v_order.payment_method,
    'deliveryMethod', v_order.delivery_method,
    'subtotal', v_order.subtotal,
    'shippingFee', v_order.shipping_fee,
    'discount', v_order.discount,
    'total', v_order.total,
    'notes', v_order.notes,
    'courier', v_order.courier,
    'trackingNumber', v_order.tracking_number,
    'trackingUrl', v_order.tracking_url,
    'createdAt', v_order.created_at,
    'shippingAddress', v_order.shipping_address,
    'shippingAddressDetail', (
      select jsonb_build_object('street', sa.street, 'city', sa.city, 'district', sa.district, 'postalCode', sa.postal_code)
      from public.shipping_addresses sa where sa.order_id = v_order.id
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productName', oi.product_name, 'quantity', oi.quantity,
        'subtotal', oi.subtotal, 'imageUrl', oi.product_image_url
      ) order by oi.created_at)
      from public.order_items oi where oi.order_id = v_order.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_order_confirmation(text, uuid) from public;
grant execute on function public.get_order_confirmation(text, uuid) to anon, authenticated;
