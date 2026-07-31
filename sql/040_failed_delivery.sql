-- Adds "Failed Delivery" as an exception branch off "Out for Delivery"
-- (not a linear 7th step — cancelled/returned already work the same
-- way), plus the admin resolution workflow (reattempt / mark returned /
-- cancel) and reason logging.
--
-- Purely additive to the order_status CHECK constraint — every existing
-- order already satisfies the widened constraint, no data migration
-- needed for any current row.
alter table public.orders drop constraint orders_order_status_check;
alter table public.orders add constraint orders_order_status_check
  check (order_status in (
    'pending', 'confirmed', 'packing', 'shipped', 'out_for_delivery',
    'delivered', 'cancelled', 'returned', 'failed_delivery'
  ));

alter table public.orders
  add column delivery_attempt_count integer not null default 0,
  add column delivery_failure_reason text;

-- order_status_history.note has existed since sql/020 but nothing has
-- ever populated it — the trigger's inserts never included it. Reads a
-- transaction-local Postgres setting so any RPC that wants to attach a
-- reason can `perform set_config('app.status_change_note', p_note,
-- true)` immediately before its update; `true` (the "missing_ok" arg to
-- current_setting) makes this a no-op (null note) for every other
-- update, exactly like today.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note text := current_setting('app.status_change_note', true);
begin
  if new.order_status is distinct from old.order_status then
    insert into public.order_status_history (order_id, changed_by, field, old_value, new_value, note)
    values (new.id, auth.uid(), 'order_status', old.order_status, new.order_status, v_note);
  end if;
  if new.payment_status is distinct from old.payment_status then
    insert into public.order_status_history (order_id, changed_by, field, old_value, new_value, note)
    values (new.id, auth.uid(), 'payment_status', old.payment_status, new.payment_status, v_note);
  end if;
  return new;
end;
$$;

-- cancel_order_atomic gains a 5th parameter (p_note) — a parameter-list
-- shape change, so per the established lesson this needs an explicit
-- DROP FUNCTION before CREATE OR REPLACE. Existing callers (cancelOrder,
-- refundOrder) are unaffected — the new param defaults to null.
drop function if exists public.cancel_order_atomic(uuid, text, text);

create or replace function public.cancel_order_atomic(
  p_order_id uuid,
  p_new_order_status text,
  p_new_payment_status text default null,
  p_note text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_current_status text;
  v_item record;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select order_status into v_current_status from public.orders where id = p_order_id for update;
  if v_current_status is null or v_current_status in ('cancelled', 'returned') then
    return false;
  end if;

  for v_item in
    select product_id, quantity from public.order_items
    where order_id = p_order_id and product_id is not null
  loop
    perform public.restore_stock(v_item.product_id, v_item.quantity);
  end loop;

  perform set_config('app.status_change_note', p_note, true);

  update public.orders
  set order_status = p_new_order_status,
      payment_status = coalesce(p_new_payment_status, payment_status)
  where id = p_order_id;

  return true;
end;
$$;

grant execute on function public.cancel_order_atomic to authenticated;

-- Marks an out-for-delivery order failed, recording why. New function —
-- no existing signature changes shape.
create or replace function public.mark_delivery_failed(
  p_order_id uuid,
  p_reason text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_current_status text;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'A failure reason is required.';
  end if;

  select order_status into v_current_status from public.orders where id = p_order_id for update;
  if v_current_status is null or v_current_status <> 'out_for_delivery' then
    return false;
  end if;

  perform set_config('app.status_change_note', p_reason, true);

  update public.orders
  set order_status = 'failed_delivery',
      delivery_failure_reason = p_reason
  where id = p_order_id;

  return true;
end;
$$;

grant execute on function public.mark_delivery_failed to authenticated;

-- Resolution path #1: try again. No stock involved (nothing was ever
-- restored on a mere failed attempt), just moves the order back onto
-- the linear path and records the attempt.
create or replace function public.reattempt_delivery(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_current_status text;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select order_status into v_current_status from public.orders where id = p_order_id for update;
  if v_current_status is null or v_current_status <> 'failed_delivery' then
    return false;
  end if;

  update public.orders
  set order_status = 'out_for_delivery',
      delivery_attempt_count = delivery_attempt_count + 1,
      delivery_failure_reason = null
  where id = p_order_id;

  return true;
end;
$$;

grant execute on function public.reattempt_delivery to authenticated;

-- Exposes delivery-attempt/failure state and a per-order-status-change
-- timeline (for per-step timestamps on the customer-facing stepper) to
-- the three guest/customer read RPCs. Additive jsonb keys only — same
-- return type on all three, no DROP FUNCTION needed anywhere here.
-- "pending" (step 1) has no history row (it's the column's default at
-- INSERT, not an UPDATE) — its timestamp is the order's own createdAt,
-- already returned separately by each of these functions.

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
        'subtotal', oi.subtotal, 'imageUrl', oi.product_image_url
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
        'subtotal', oi.subtotal, 'imageUrl', oi.product_image_url
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
        'subtotal', oi.subtotal, 'imageUrl', oi.product_image_url
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
