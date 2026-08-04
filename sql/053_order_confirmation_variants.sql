-- Stage 6: order_items.variant_name/variant_color_hex are now actually
-- populated (sql/052) -- expose them to the guest/customer read RPCs the
-- same way sql/040 added deliveryAttemptCount/failureReason/statusHistory:
-- additive jsonb keys only, same return type on all three, no DROP
-- FUNCTION needed anywhere here.

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
    'deliveryAttemptCount', v_order.delivery_attempt_count,
    'failureReason', v_order.delivery_failure_reason,
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
        'subtotal', oi.subtotal, 'imageUrl', oi.product_image_url,
        'variantName', oi.variant_name, 'variantColorHex', oi.variant_color_hex
      ) order by oi.created_at)
      from public.order_items oi where oi.order_id = v_order.id
    ), '[]'::jsonb),
    'statusHistory', coalesce((
      select jsonb_agg(jsonb_build_object(
        'status', h.new_value, 'changedAt', h.created_at, 'note', h.note
      ) order by h.created_at)
      from public.order_status_history h
      where h.order_id = v_order.id and h.field = 'order_status'
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_order_confirmation(text, uuid) from public;
grant execute on function public.get_order_confirmation(text, uuid) to anon, authenticated;

create or replace function public.get_guest_order_by_id(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_result jsonb;
begin
  select * into v_order from public.orders where id = p_order_id and user_id is null;
  if v_order.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'customerName', v_order.customer_name,
    'customerEmail', v_order.customer_email,
    'customerPhone', v_order.customer_phone,
    'paymentStatus', v_order.payment_status,
    'orderStatus', v_order.order_status,
    'paymentMethod', v_order.payment_method,
    'deliveryMethod', v_order.delivery_method,
    'deliveryAttemptCount', v_order.delivery_attempt_count,
    'failureReason', v_order.delivery_failure_reason,
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
        'subtotal', oi.subtotal, 'imageUrl', oi.product_image_url,
        'variantName', oi.variant_name, 'variantColorHex', oi.variant_color_hex
      ) order by oi.created_at)
      from public.order_items oi where oi.order_id = v_order.id
    ), '[]'::jsonb),
    'statusHistory', coalesce((
      select jsonb_agg(jsonb_build_object(
        'status', h.new_value, 'changedAt', h.created_at, 'note', h.note
      ) order by h.created_at)
      from public.order_status_history h
      where h.order_id = v_order.id and h.field = 'order_status'
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_guest_order_by_id(uuid) from public;
grant execute on function public.get_guest_order_by_id(uuid) to anon, authenticated;

create or replace function public.track_order(p_order_number text, p_contact text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_result jsonb;
begin
  select * into v_order from public.orders
    where order_number = p_order_number
      and (customer_phone = p_contact or lower(customer_email) = lower(p_contact));
  if v_order.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'orderNumber', v_order.order_number,
    'paymentStatus', v_order.payment_status,
    'orderStatus', v_order.order_status,
    'paymentMethod', v_order.payment_method,
    'deliveryMethod', v_order.delivery_method,
    'deliveryAttemptCount', v_order.delivery_attempt_count,
    'failureReason', v_order.delivery_failure_reason,
    'subtotal', v_order.subtotal,
    'shippingFee', v_order.shipping_fee,
    'discount', v_order.discount,
    'total', v_order.total,
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
        'subtotal', oi.subtotal, 'imageUrl', oi.product_image_url,
        'variantName', oi.variant_name, 'variantColorHex', oi.variant_color_hex
      ) order by oi.created_at)
      from public.order_items oi where oi.order_id = v_order.id
    ), '[]'::jsonb),
    'statusHistory', coalesce((
      select jsonb_agg(jsonb_build_object(
        'status', h.new_value, 'changedAt', h.created_at, 'note', h.note
      ) order by h.created_at)
      from public.order_status_history h
      where h.order_id = v_order.id and h.field = 'order_status'
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
