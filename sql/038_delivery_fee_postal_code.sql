-- Switches delivery pricing from the free-text CITY field (a regex match
-- against "Colombo 01".."Colombo 15", sql/029) to the POSTAL CODE, which
-- is Sri Lanka's actual, unambiguous system (Colombo 1-15 = 00100-01500).
--
-- Root cause of the reported bug: a customer entered postal code "12"
-- (meaning Colombo 12) and was charged the outside-zone rate, because
-- nothing normalized the code before comparing it. The rate table itself
-- (00100-01500 -> Rs.255) was always correct.
--
-- normalize_postal_code is a direct PL/pgSQL port of the TS function of
-- the same purpose in lib/delivery-fee.ts (the source of truth — kept in
-- sync by hand, same convention already used for the city-regex mirror
-- this replaces). See that file for the accepted-input matrix and why
-- string comparison on same-length zero-padded codes is safe.
create or replace function public.normalize_postal_code(p_postal_code text)
returns text language plpgsql immutable as $$
declare
  v_digits text;
  v_stripped text;
  v_zone int;
begin
  if p_postal_code is null or trim(p_postal_code) = '' then
    return null;
  end if;

  v_digits := regexp_replace(p_postal_code, '\D', '', 'g');
  if v_digits = '' then
    return null;
  end if;

  if length(v_digits) <= 3 then
    v_zone := v_digits::int;
    if v_zone between 1 and 15 then
      return '0' || lpad(v_zone::text, 2, '0') || '00';
    end if;
    return null;
  elsif length(v_digits) = 4 then
    return '0' || v_digits;
  elsif length(v_digits) = 5 then
    return v_digits;
  end if;

  -- Longer/malformed input (e.g. stray extra zeros like "00 12 00" ->
  -- "001200") — try stripping leading zeros down to a recognizable
  -- 4-or-5-digit code before giving up; never guess beyond that.
  v_stripped := regexp_replace(v_digits, '^0+', '');
  if length(v_stripped) = 4 then
    return '0' || v_stripped;
  elsif length(v_stripped) = 5 then
    return v_stripped;
  elsif length(v_stripped) between 1 and 3 then
    v_zone := v_stripped::int;
    if v_zone between 1 and 15 then
      return '0' || lpad(v_zone::text, 2, '0') || '00';
    end if;
  end if;
  return null;
end;
$$;

-- create_order_atomic gains a 20th parameter (p_client_shipping_fee), so
-- per the sql/022/026/031 lesson this needs an explicit DROP FUNCTION —
-- CREATE OR REPLACE does not allow the parameter list to change shape.
drop function if exists public.create_order_atomic(
  text, text, text, text, text, text, text, text, text, text, text, text,
  jsonb, numeric, text, text, text, uuid, text
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
  p_idempotency_key text default null,
  -- The client's own computed delivery fee (lib/delivery-fee.ts) — never
  -- used to set the charged amount (v_delivery_fee below is always
  -- computed independently, server-side, from the submitted address).
  -- Compared against it purely so a disagreement gets logged instead of
  -- silently passing unnoticed (order_error_log, best-effort).
  p_client_shipping_fee numeric default null
) returns table (order_id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb; v_product record; v_quantity integer;
  v_subtotal numeric(10,2) := 0; v_delivery_fee numeric(10,2); v_total numeric(10,2);
  v_order_id uuid; v_order_number text;
  v_street text; v_city text; v_district text; v_payment_status text;
  v_coupon record; v_coupon_applied boolean := false; v_discount numeric(10,2) := 0;
  v_existing record;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty.'; end if;
  if p_delivery_method not in ('standard', 'pickup') then raise exception 'Invalid delivery method.'; end if;
  if p_payment_method not in ('cod', 'bank_transfer', 'payhere') then raise exception 'Invalid payment method.'; end if;
  if p_payment_method = 'bank_transfer' and coalesce(nullif(trim(p_payment_reference), ''), p_slip_url) is null then
    raise exception 'Provide a bank slip or a reference number.';
  end if;

  -- Idempotent replay: a retry with the same key (lost response, page
  -- reload mid-request) returns the order already created instead of
  -- re-running any stock reduction or coupon redemption.
  if p_idempotency_key is not null then
    select o.id, o.order_number into v_existing from public.orders o
      where o.idempotency_key = p_idempotency_key
        and (v_user_id is not null and o.user_id = v_user_id or v_user_id is null and o.user_id is null);
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

  -- Server-computed delivery fee — the sole authority. Pickup is free and
  -- uses the fixed store address (Wellampitiya, Colombo district) rather
  -- than the customer's own. Colombo district AND a normalized postal
  -- code in 00100-01500 gets the discounted rate; everything else
  -- (including other towns within Colombo District, e.g. Dehiwala,
  -- Moratuwa) pays the standard rate.
  if p_delivery_method = 'pickup' then
    v_delivery_fee := 0; v_street := 'Salawatta Road'; v_city := 'Wellampitiya'; v_district := 'Colombo';
  else
    v_delivery_fee := case
      when p_shipping_district = 'Colombo'
        and public.normalize_postal_code(p_shipping_postal_code) between '00100' and '01500'
      then 255
      else 400
    end;
    v_street := p_shipping_street; v_city := p_shipping_city; v_district := p_shipping_district;
  end if;

  -- Observability only, never blocking: if the client's own preview
  -- disagreed with what the server just computed, log it so a client-side
  -- bug (stale cache, a future regression) is visible instead of silently
  -- passing unnoticed. The server's v_delivery_fee is what's charged
  -- either way, regardless of this comparison's outcome.
  if p_client_shipping_fee is not null and p_client_shipping_fee <> v_delivery_fee then
    begin
      insert into public.order_error_log (reference_code, error_code, error_message, context)
      values (
        'DISC-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4),
        'DELIVERY_FEE_MISMATCH',
        format('Client computed %s, server computed %s', p_client_shipping_fee, v_delivery_fee),
        jsonb_build_object(
          'clientShippingFee', p_client_shipping_fee, 'serverShippingFee', v_delivery_fee,
          'district', p_shipping_district, 'postalCode', p_shipping_postal_code
        )
      );
    exception when others then
      -- Logging must never block order creation.
      null;
    end;
  end if;

  -- Coupon validation + atomic redemption. `for update` locks the coupon
  -- row immediately, before any validation. v_coupon_applied is the only
  -- thing read outside this block now — v_coupon itself is only ever
  -- touched here, where it's guaranteed to have just been assigned.
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
    v_coupon_applied := true;
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

  if v_coupon_applied then
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
