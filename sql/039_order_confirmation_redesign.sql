-- Two additive keys for the order-confirmation redesign — same jsonb
-- return type, so a plain `create or replace`, no DROP FUNCTION needed:
--   - items[].productId — "You may also like" recommendations
--     (getCartRecommendations) need product ids, which this function
--     never exposed before.
--   - paymentReference — the bank-transfer reference number the customer
--     already gave at checkout, shown back to them on the confirmation
--     page instead of asking again.
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
    'paymentReference', (select p.reference_number from public.payments p where p.order_id = v_order.id),
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
        'productId', oi.product_id, 'productName', oi.product_name, 'quantity', oi.quantity,
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
