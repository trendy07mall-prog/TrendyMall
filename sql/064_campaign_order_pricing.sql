-- Phase 6 of the Campaign & Promotion Management System.
--
-- Phases 1-5 made campaign pricing visible everywhere a customer looks
-- (homepage, shop, PDP) but create_order_atomic (sql/060) -- the sole
-- authoritative price source at order time -- never learned about
-- campaigns. It re-derives unit_price as coalesce(sale_price,
-- regular_price) and rejects the order if that disagrees with the
-- client's (already campaign-aware) total by more than Rs 0.01. This
-- migration threads campaign pricing into that same re-derivation, the
-- same way it already handles stock/coupon/delivery-fee -- never trusted
-- from the client, always recomputed server-side.
--
-- Also wires up campaigns.free_shipping_enabled (schema since Phase 1, a
-- working admin toggle that has never done anything) using the exact same
-- mechanism the existing 'free_shipping' coupon type already uses: a
-- discount line, not zeroing shipping_fee directly -- so orders.shipping_fee
-- keeps meaning "the real delivery cost" for reporting, and invoices/
-- emails/admin order view need no changes.

-- ── order_items: capture which campaign (if any) priced this line ──────
alter table public.order_items
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

-- ── create_order_atomic: campaign-aware pricing + free shipping ────────
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
  v_customer_redemption_count integer;
  v_variant_id uuid; v_variant_product_id uuid;
  v_variant_regular_price numeric; v_variant_sale_price numeric;
  v_variant_stock integer; v_variant_color_name text; v_variant_color_hex text;
  v_variant_unit_price numeric(10,2);
  v_variant_campaign_price numeric; v_variant_campaign_id uuid;
  v_order_variant_ids uuid[] := '{}';
  v_free_shipping_from_campaign boolean := false;
  v_shipping_already_waived numeric(10,2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty.'; end if;
  if p_delivery_method not in ('standard', 'pickup') then raise exception 'Invalid delivery method.'; end if;
  if p_payment_method not in ('cod', 'bank_transfer', 'payhere') then raise exception 'Invalid payment method.'; end if;
  if p_payment_method = 'bank_transfer' and coalesce(nullif(trim(p_payment_reference), ''), p_slip_url) is null then
    raise exception 'Provide a bank slip or a reference number.';
  end if;

  if p_idempotency_key is not null then
    select o.id, o.order_number into v_existing from public.orders o
      where o.idempotency_key = p_idempotency_key
        and (v_user_id is not null and o.user_id = v_user_id or v_user_id is null and o.user_id is null);
    if v_existing.id is not null then
      return query select v_existing.id, v_existing.order_number;
      return;
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Invalid quantity.'; end if;
    select pr.id, pr.name, pr.is_deleted, pr.status into v_product
    from public.products pr where pr.id = (v_item->>'product_id')::uuid;
    if v_product.id is null or v_product.is_deleted or v_product.status <> 'published' then
      raise exception 'A product in your cart is no longer available.';
    end if;

    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    if v_variant_id is null then
      raise exception 'A product option is required.';
    end if;

    select pv.product_id, pv.regular_price, pv.sale_price, pv.stock
    into v_variant_product_id, v_variant_regular_price, v_variant_sale_price, v_variant_stock
    from public.product_variants pv where pv.id = v_variant_id and pv.is_active;
    if v_variant_product_id is null or v_variant_product_id <> v_product.id then
      raise exception 'A selected product option is no longer available.';
    end if;

    if not public.reduce_stock(v_product.id, v_quantity) then
      raise exception 'Not enough stock for %.', v_product.name;
    end if;
    if v_variant_stock is not null then
      if not public.reduce_variant_stock(v_variant_id, v_quantity) then
        raise exception 'Not enough stock for %.', v_product.name;
      end if;
    end if;

    -- Gating mirrors getActiveCampaignPricesForVariants exactly: is_active
    -- item, published/non-archived campaign, already started, not yet
    -- ended. Lowest campaign_price wins if more than one qualifies (same
    -- tie-break as selectLowestActiveCampaignPrices).
    select min(ci.campaign_price) into v_variant_campaign_price
    from public.campaign_items ci
    join public.campaigns c on c.id = ci.campaign_id
    where ci.variant_id = v_variant_id
      and ci.is_active
      and c.status = 'published'
      and c.is_archived = false
      and c.start_at <= now()
      and (c.end_at is null or c.end_at > now());

    v_subtotal := v_subtotal
      + least(coalesce(v_variant_sale_price, v_variant_regular_price),
              coalesce(v_variant_campaign_price, coalesce(v_variant_sale_price, v_variant_regular_price)))
        * v_quantity;

    v_order_variant_ids := array_append(v_order_variant_ids, v_variant_id);
  end loop;

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

    select exists (
      select 1
      from public.campaign_items ci
      join public.campaigns c on c.id = ci.campaign_id
      where ci.variant_id = any(v_order_variant_ids)
        and ci.is_active
        and c.status = 'published'
        and c.is_archived = false
        and c.free_shipping_enabled
        and c.start_at <= now()
        and (c.end_at is null or c.end_at > now())
    ) into v_free_shipping_from_campaign;
  end if;

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
      null;
    end;
  end if;

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
      if v_user_id is not null then
        select count(*) into v_customer_redemption_count
        from public.coupon_redemptions cr
        where cr.coupon_id = v_coupon.id and cr.user_id = v_user_id;
      else
        select count(*) into v_customer_redemption_count
        from public.coupon_redemptions cr
        join public.orders o on o.id = cr.order_id
        where cr.coupon_id = v_coupon.id and lower(o.customer_email) = lower(trim(p_customer_email));
      end if;
      if v_customer_redemption_count >= v_coupon.usage_limit_per_customer then
        raise exception 'You have already used this coupon the maximum number of times.';
      end if;
    end if;

    update public.coupons set usage_count = usage_count + 1
      where id = v_coupon.id and (usage_limit is null or usage_count < usage_limit);
    if not found then
      raise exception 'This coupon has reached its usage limit.';
    end if;

    v_discount := case v_coupon.type
      when 'percentage' then
        case when v_coupon.max_discount_amount is not null
          then least(round(v_subtotal * v_coupon.value / 100, 2), v_coupon.max_discount_amount)
          else round(v_subtotal * v_coupon.value / 100, 2)
        end
      when 'fixed' then least(v_coupon.value, v_subtotal)
      when 'free_shipping' then v_delivery_fee
      else 0
    end;
    v_coupon_applied := true;
  end if;

  -- Campaign free-shipping tops up the discount by whatever of the
  -- delivery fee isn't already waived by a free_shipping coupon -- never a
  -- second full v_delivery_fee on top of one the coupon already granted.
  if v_free_shipping_from_campaign and v_delivery_fee > 0 then
    v_shipping_already_waived := 0;
    -- A nested IF, not `v_coupon_applied and v_coupon.type = ...` in one
    -- expression: v_coupon is an unassigned record whenever no coupon was
    -- supplied, and Postgres can't resolve a field on it at all (not even
    -- as a short-circuited false) -- "record v_coupon is not assigned yet".
    if v_coupon_applied then
      if v_coupon.type = 'free_shipping' then
        v_shipping_already_waived := v_delivery_fee;
      end if;
    end if;
    v_discount := v_discount + greatest(0, v_delivery_fee - v_shipping_already_waived);
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

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    select pr.id, pr.name,
      (select pi.image_url from public.product_images pi where pi.product_id = pr.id order by pi.sort_order limit 1) as image_url
    into v_product from public.products pr where pr.id = (v_item->>'product_id')::uuid;

    v_variant_id := (v_item->>'variant_id')::uuid;
    select pv.regular_price, pv.sale_price, pv.color_name, pv.color_hex
    into v_variant_regular_price, v_variant_sale_price, v_variant_color_name, v_variant_color_hex
    from public.product_variants pv where pv.id = v_variant_id;

    select ci.campaign_price, ci.campaign_id into v_variant_campaign_price, v_variant_campaign_id
    from public.campaign_items ci
    join public.campaigns c on c.id = ci.campaign_id
    where ci.variant_id = v_variant_id
      and ci.is_active
      and c.status = 'published'
      and c.is_archived = false
      and c.start_at <= now()
      and (c.end_at is null or c.end_at > now())
    order by ci.campaign_price asc
    limit 1;

    if v_variant_campaign_price is not null
       and v_variant_campaign_price < coalesce(v_variant_sale_price, v_variant_regular_price) then
      v_variant_unit_price := v_variant_campaign_price;
    else
      v_variant_unit_price := coalesce(v_variant_sale_price, v_variant_regular_price);
      v_variant_campaign_id := null;
    end if;

    insert into public.order_items (
      order_id, product_id, product_name, unit_price, quantity, subtotal, product_image_url,
      variant_id, variant_name, variant_color_hex, attribute_selections, campaign_id
    )
    values (
      v_order_id, v_product.id, v_product.name,
      v_variant_unit_price, v_quantity, v_variant_unit_price * v_quantity, v_product.image_url,
      v_variant_id, v_variant_color_name, v_variant_color_hex, v_item->'attribute_selections', v_variant_campaign_id
    );
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.create_order_atomic to authenticated, anon;
