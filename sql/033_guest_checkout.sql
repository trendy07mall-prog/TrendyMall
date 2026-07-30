-- Checkout Redesign (v12), Phase 4 — guest checkout.
--
-- 1) create_order_atomic no longer requires a logged-in user.
--    orders.user_id has been nullable since sql/020; only this function's
--    own explicit check ever blocked a guest order. Same 19-arg signature
--    as sql/032 — a logic-only removal, so this is a clean
--    `create or replace`, no DROP FUNCTION needed (only required when the
--    parameter list or return type changes shape, per the sql/022/sql/026/
--    track_order-below lessons).
create or replace function public.create_order_atomic(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_shipping_first_name text, p_shipping_last_name text, p_shipping_street text,
  p_shipping_city text, p_shipping_district text, p_shipping_postal_code text,
  p_delivery_method text, p_payment_method text, p_notes text,
  p_items jsonb, p_client_total numeric,
  p_payment_reference text default null,
  p_slip_url text default null,
  p_coupon_code text default null,
  p_source_address_id uuid default null,
  p_idempotency_key text default null
) returns table (order_id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb; v_product record; v_quantity integer;
  v_subtotal numeric(10,2) := 0; v_delivery_fee numeric(10,2); v_total numeric(10,2);
  v_order_id uuid; v_order_number text;
  v_street text; v_city text; v_district text; v_payment_status text;
  v_coupon record; v_discount numeric(10,2) := 0;
  v_existing record;
begin
  -- Guest checkout (v12 Phase 4): v_user_id may now be null. Per-customer
  -- coupon usage limits (below) simply don't apply to guests as a result
  -- — a guest has no persistent id to dedupe against. Accepted, not fixed
  -- this phase (would need phone/email-based redemption tracking, a
  -- separate feature).
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty.'; end if;
  if p_delivery_method not in ('standard', 'pickup') then raise exception 'Invalid delivery method.'; end if;
  if p_payment_method not in ('cod', 'bank_transfer', 'payhere') then raise exception 'Invalid payment method.'; end if;
  if p_payment_method = 'bank_transfer' and coalesce(nullif(trim(p_payment_reference), ''), p_slip_url) is null then
    raise exception 'Provide a bank slip or a reference number.';
  end if;

  -- Idempotent replay: a retry with the same key (lost response, page
  -- reload mid-request) returns the order already created instead of
  -- re-running any stock reduction or coupon redemption. Guest orders
  -- match on idempotency_key alone (no user_id to also scope by).
  if p_idempotency_key is not null then
    select id, order_number into v_existing from public.orders
      where idempotency_key = p_idempotency_key
        and (v_user_id is not null and user_id = v_user_id or v_user_id is null and user_id is null);
    if v_existing.id is not null then
      return query select v_existing.id, v_existing.order_number;
      return;
    end if;
  end if;

  -- Pass 1: re-price every line from the live products table and reduce
  -- stock atomically. Never reads price/name from the caller.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Invalid quantity.'; end if;
    select pr.id, pr.name, pr.actual_price, pr.special_price, pr.is_deleted, pr.status into v_product
    from public.products pr where pr.id = (v_item->>'product_id')::uuid;
    if v_product.id is null or v_product.is_deleted or v_product.status <> 'published' then
      raise exception 'A product in your cart is no longer available.';
    end if;
    if not public.reduce_stock(v_product.id, v_quantity) then
      raise exception 'Not enough stock for %.', v_product.name;
    end if;
    v_subtotal := v_subtotal + coalesce(v_product.special_price, v_product.actual_price) * v_quantity;
  end loop;

  -- Server-computed delivery fee. Pickup is free and uses the fixed store
  -- address (Wellampitiya, Colombo district) rather than the customer's own.
  -- Only a Colombo 01-15 CITY zone gets the discounted rate — see sql/029's
  -- header comment. Kept in sync by hand with lib/shipping-rates.ts.
  if p_delivery_method = 'pickup' then
    v_delivery_fee := 0; v_street := 'Salawatta Road'; v_city := 'Wellampitiya'; v_district := 'Colombo';
  else
    v_delivery_fee := case
      when p_shipping_city ~* '^colombo\s*-?\s*0*([1-9]|1[0-5])$' then 255
      else 400
    end;
    v_street := p_shipping_street; v_city := p_shipping_city; v_district := p_shipping_district;
  end if;

  -- Coupon validation + atomic redemption. `for update` locks the coupon
  -- row immediately, before any validation — this is what makes BOTH the
  -- total usage_limit and the per-customer usage_limit_per_customer safe
  -- under concurrency, not just the final increment. usage_limit_per_
  -- customer is a no-op for guests (v_user_id is null, see header note).
  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select * into v_coupon from public.coupons
      where lower(code) = lower(trim(p_coupon_code))
      for update;

    if v_coupon.id is null or not v_coupon.is_active then
      raise exception 'Invalid coupon code.';
    end if;
    if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
      raise exception 'This coupon is not active yet.';
    end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
      raise exception 'This coupon has expired.';
    end if;
    if v_subtotal < v_coupon.min_order_value then
      raise exception 'This coupon requires a minimum order of %.', v_coupon.min_order_value;
    end if;
    if v_coupon.usage_limit_per_customer is not null and v_user_id is not null then
      if (select count(*) from public.coupon_redemptions
          where coupon_id = v_coupon.id and user_id = v_user_id) >= v_coupon.usage_limit_per_customer then
        raise exception 'You have already used this coupon the maximum number of times.';
      end if;
    end if;

    update public.coupons set usage_count = usage_count + 1
      where id = v_coupon.id and (usage_limit is null or usage_count < usage_limit);
    if not found then
      raise exception 'This coupon has reached its usage limit.';
    end if;

    v_discount := case v_coupon.type
      when 'percentage' then round(v_subtotal * v_coupon.value / 100, 2)
      when 'fixed' then least(v_coupon.value, v_subtotal)
      when 'free_shipping' then v_delivery_fee
      else 0
    end;
  end if;

  v_total := greatest(0, v_subtotal + v_delivery_fee - v_discount);
  if p_client_total is not null and abs(p_client_total - v_total) > 0.01 then
    raise exception 'Prices have changed — please refresh your cart and try again.';
  end if;

  v_payment_status := case when p_payment_method = 'bank_transfer' then 'awaiting_verification' else 'pending' end;

  insert into public.orders as o (
    user_id, customer_name, customer_email, customer_phone, shipping_address,
    subtotal, shipping_fee, discount, total, delivery_method, payment_method, payment_status, notes,
    idempotency_key
  ) values (
    v_user_id, p_customer_name, p_customer_email, p_customer_phone,
    v_street || ', ' || v_city || ', ' || v_district || coalesce(nullif(', ' || p_shipping_postal_code, ', '), ''),
    v_subtotal, v_delivery_fee, v_discount, v_total, p_delivery_method, p_payment_method, v_payment_status, p_notes,
    p_idempotency_key
  ) returning o.id, o.order_number into v_order_id, v_order_number;

  if v_coupon.id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, discount_amount)
    values (v_coupon.id, v_order_id, v_user_id, v_discount);
  end if;

  insert into public.shipping_addresses (
    order_id, first_name, last_name, phone, email, street, city, district, postal_code, source_address_id
  )
  values (
    v_order_id, p_shipping_first_name, p_shipping_last_name, p_customer_phone, p_customer_email,
    v_street, v_city, v_district, case when p_delivery_method = 'pickup' then null else p_shipping_postal_code end,
    p_source_address_id
  );

  insert into public.payments (order_id, gateway, reference_number, slip_url, amount, currency, status)
  values (v_order_id, p_payment_method, p_payment_reference, p_slip_url, v_total, 'LKR', v_payment_status);

  -- Pass 2: now that order_id exists, insert the priced+snapshotted lines.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    select pr.id, pr.name, pr.actual_price, pr.special_price,
      (select pi.image_url from public.product_images pi where pi.product_id = pr.id order by pi.sort_order limit 1) as image_url
    into v_product from public.products pr where pr.id = (v_item->>'product_id')::uuid;
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, product_image_url)
    values (v_order_id, v_product.id, v_product.name, coalesce(v_product.special_price, v_product.actual_price), v_quantity,
      coalesce(v_product.special_price, v_product.actual_price) * v_quantity, v_product.image_url);
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.create_order_atomic to authenticated, anon;

-- 2) Lets a guest's own just-placed order render on /checkout/success
-- without a session. Scoped to exactly one order id and only ever
-- returns a row when that order has no user_id — a logged-in customer's
-- order is never reachable through this function regardless of id, and
-- because it takes a single specific id (never a broader filter), it
-- can't become an enumeration surface no matter what future code calls
-- it (unlike a blanket RLS policy keyed only on "user_id is null", which
-- would let any query — not just this narrow one — list every guest
-- order ever placed).
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

revoke all on function public.get_guest_order_by_id(uuid) from public;
grant execute on function public.get_guest_order_by_id(uuid) to anon, authenticated;

-- 3) Rate limiting for the guest order-lookup function below — IP-keyed.
-- RLS is enabled with zero policies (deny-all for anon/authenticated via
-- the API) — this table is only ever touched through
-- check_guest_lookup_rate_limit, a security-definer function that
-- bypasses RLS as its owner. Without this, Supabase's default
-- public-schema grants would let any client read/reset attempt counts
-- directly over PostgREST, defeating the rate limit entirely.
create table public.guest_lookup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  attempted_at timestamptz not null default now()
);

alter table public.guest_lookup_attempts enable row level security;

create index guest_lookup_attempts_ip_idx on public.guest_lookup_attempts(ip, attempted_at);

create or replace function public.check_guest_lookup_rate_limit(
  p_ip text,
  p_max_attempts int default 10,
  p_window_minutes int default 15
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  -- Light housekeeping — keeps this small, append-only table from
  -- growing unbounded without needing a separate scheduled job.
  delete from public.guest_lookup_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_count from public.guest_lookup_attempts
    where ip = p_ip and attempted_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into public.guest_lookup_attempts (ip) values (p_ip);
  return true;
end;
$$;

revoke all on function public.check_guest_lookup_rate_limit(text, int, int) from public;
grant execute on function public.check_guest_lookup_rate_limit(text, int, int) to anon, authenticated;

-- 4) Upgrades track_order (sql/015) in place — same lookup, same
-- security-definer/single-row-match shape, extended rather than
-- replaced with a parallel function. Now matches on EITHER phone or
-- email (not phone-only) and returns full order detail (items,
-- shipping address, tracking) as a single jsonb blob instead of a
-- 4-column table, so the guest order-detail view never needs a second,
-- separately-RLS-blocked query for items/address. The return type
-- change (table -> jsonb) means CREATE OR REPLACE alone won't do —
-- Postgres requires the old signature dropped first here too.
drop function if exists public.track_order(text, text);

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
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
