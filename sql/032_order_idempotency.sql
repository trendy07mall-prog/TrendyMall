-- Checkout Redesign (v12), Phase 3 — closes the one real gap in "reconfirm
-- at order creation": everything else (server-side re-pricing, atomic stock
-- reduction, coupon validation/counting) already existed before this
-- migration. What was missing is protection against a customer's own
-- double-submit or a retried network request creating two separate orders
-- — the client already disables the submit button while pending, but that
-- alone doesn't cover a page reload mid-request or a retried request at the
-- network layer.
--
-- Nullable + a partial unique index (not a plain unique column) so
-- unlimited pre-existing orders with no key can coexist without violating
-- uniqueness — only non-null keys are required to be distinct.
alter table public.orders
  add column idempotency_key text;

create unique index orders_idempotency_key_unique_idx
  on public.orders(idempotency_key) where idempotency_key is not null;

-- Adding a new parameter changes create_order_atomic's signature shape, so
-- per the sql/022/sql/026 lesson this needs an explicit DROP FUNCTION
-- (matching the exact 18-arg type list of the currently-live version,
-- sql/031) before CREATE OR REPLACE.
drop function if exists public.create_order_atomic(
  text, text, text, text, text, text, text, text, text, text, text, text, jsonb, numeric, text, text, text, uuid
);

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
  if v_user_id is null then raise exception 'You must be logged in to place an order.'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty.'; end if;
  if p_delivery_method not in ('standard', 'pickup') then raise exception 'Invalid delivery method.'; end if;
  if p_payment_method not in ('cod', 'bank_transfer', 'payhere') then raise exception 'Invalid payment method.'; end if;
  if p_payment_method = 'bank_transfer' and coalesce(nullif(trim(p_payment_reference), ''), p_slip_url) is null then
    raise exception 'Provide a bank slip or a reference number.';
  end if;

  -- Idempotent replay: a retry with the same key (lost response, page
  -- reload mid-request) returns the order already created instead of
  -- re-running any stock reduction or coupon redemption. Checked before
  -- any side-effecting work below, not just before the final insert.
  if p_idempotency_key is not null then
    select id, order_number into v_existing from public.orders
      where idempotency_key = p_idempotency_key and user_id = v_user_id;
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
  -- under concurrency, not just the final increment.
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
    if v_coupon.usage_limit_per_customer is not null then
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

grant execute on function public.create_order_atomic to authenticated;
