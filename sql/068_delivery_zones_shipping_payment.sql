-- Phase 3 of the admin Settings project — Delivery Zones, Free Shipping,
-- Store Pickup, and Payment Method toggles. HIGHEST-RISK migration in the
-- project: touches create_order_atomic, the sole authoritative pricing
-- function for every real order. The two literal boundary constants
-- ('00100'/'01500') and rates (255/400) that were hand-duplicated between
-- lib/delivery-fee.ts and this function (per that file's own header
-- comment) now live in ONE place -- this table -- read by both. The
-- district+postal-range dual-check that gates the in-zone rate is
-- preserved exactly as it existed before this migration; this is
-- deliberate, not simplified to postal-range-only, since that distinction
-- has caused real bugs before.

-- ── delivery_zones ──────────────────────────────────────────────────────
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  postal_code_start text,   -- null = no postal restriction (the catch-all/default zone)
  postal_code_end text,
  district_match text,      -- null = no district restriction; 'Colombo' for the in-zone rate
  rate numeric(10,2) not null,
  is_default boolean not null default false,  -- exactly one active zone should be default (the fallback)
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index delivery_zones_status_idx on public.delivery_zones(status);

create trigger trg_delivery_zones_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();

alter table public.delivery_zones enable row level security;

create policy "delivery_zones_select_active_or_admin" on public.delivery_zones
  for select using (status = 'active' or public.is_admin());

create policy "delivery_zones_admin_write" on public.delivery_zones
  for all using (public.is_admin()) with check (public.is_admin());

-- Seeded to reproduce today's exact live rule: Colombo 1-15 (postal
-- 00100-01500, district must be 'Colombo') -> Rs 255; everything else ->
-- Rs 400. A no-op migration for customers until an admin changes something.
insert into public.delivery_zones
  (name, postal_code_start, postal_code_end, district_match, rate, is_default, status, sort_order) values
  ('Colombo 1-15', '00100', '01500', 'Colombo', 255, false, 'active', 0),
  ('Other Sri Lanka', null, null, null, 400, true, 'active', 1);

-- ── shipping.* / payment.* settings (reuses Phase 1's store_settings) ──
insert into public.store_settings (key, value, type, group_name, description) values
  ('shipping.free_shipping_enabled', 'false', 'boolean', 'shipping', 'Waive delivery fee above a minimum order amount'),
  ('shipping.free_shipping_min_amount', '0', 'number', 'shipping', 'Minimum order subtotal (LKR) for free shipping'),
  ('shipping.pickup_enabled', 'true', 'boolean', 'shipping', 'Offer Store Pickup at checkout'),
  ('shipping.pickup_name', '"TrendyMall Store"', 'string', 'shipping', 'Pickup location display name'),
  ('shipping.pickup_address', '"Salawatta Road, Wellampitiya"', 'string', 'shipping', 'Pickup location address'),
  ('shipping.pickup_instructions', '""', 'string', 'shipping', 'Optional pickup instructions'),
  ('shipping.pickup_hours', '"Daily, 10am – 4pm"', 'string', 'shipping', 'Pickup hours display text'),
  ('payment.cod_enabled', 'true', 'boolean', 'payment', 'Offer Cash on Delivery at checkout'),
  ('payment.bank_transfer_enabled', 'true', 'boolean', 'payment', 'Offer Bank Transfer at checkout'),
  ('payment.online_payment_enabled', 'true', 'boolean', 'payment', 'Offer Card Payment (PayHere) at checkout -- also requires PAYHERE_MERCHANT_ID/SECRET to be configured; this toggle can never enable PayHere on its own');

-- ── create_order_atomic: zone-driven fee + threshold free shipping ─────
-- Full function body reproduced from sql/064_campaign_order_pricing.sql
-- (the last prior definition) with exactly two sections changed:
--   1. The delivery-fee `case` (previously hardcoded 255/400 literals)
--      now queries delivery_zones. Pickup's address fields now trust the
--      client-supplied p_shipping_* values (CheckoutForm.tsx now sends the
--      real Settings-sourced pickup address for pickup orders) instead of
--      hardcoded 'Salawatta Road'/'Wellampitiya'/'Colombo' literals --
--      pickup's FEE stays hardcoded to 0 either way, unchanged, since that
--      is the only part that is money.
--   2. The free-shipping top-up condition gains a third OR-branch (a
--      sitewide minimum-order threshold, read from store_settings),
--      composed the exact same "top up whatever the coupon hasn't already
--      waived, never double-count" way the existing campaign branch
--      already works.
-- Every other line is unchanged from sql/064.
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
  v_free_shipping_enabled boolean;
  v_free_shipping_min_amount numeric;
  v_free_shipping_from_threshold boolean := false;
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
    -- Fee stays hardcoded to 0 -- the only part that's money, unchanged.
    -- Address text now trusts the client (CheckoutForm.tsx sends the real,
    -- Settings-sourced pickup address for pickup orders), same as standard
    -- delivery already trusts the customer's own entered address -- text
    -- alone carries no monetary risk.
    v_delivery_fee := 0; v_street := p_shipping_street; v_city := p_shipping_city; v_district := p_shipping_district;
  else
    select z.rate into v_delivery_fee
    from public.delivery_zones z
    where z.status = 'active' and z.is_default = false
      and (z.district_match is null or z.district_match = p_shipping_district)
      and z.postal_code_start is not null and z.postal_code_end is not null
      and public.normalize_postal_code(p_shipping_postal_code) between z.postal_code_start and z.postal_code_end
    order by z.sort_order
    limit 1;

    if v_delivery_fee is null then
      select z.rate into v_delivery_fee from public.delivery_zones z
        where z.is_default and z.status = 'active' limit 1;
    end if;
    if v_delivery_fee is null then
      -- Absolute safety net -- should never trigger with a correctly
      -- seeded table, but checkout must never hard-fail on a misconfigured
      -- zones table.
      v_delivery_fee := 400;
    end if;

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

    select (value #>> '{}')::boolean into v_free_shipping_enabled
      from public.store_settings where key = 'shipping.free_shipping_enabled';
    select (value #>> '{}')::numeric into v_free_shipping_min_amount
      from public.store_settings where key = 'shipping.free_shipping_min_amount';
    v_free_shipping_from_threshold :=
      coalesce(v_free_shipping_enabled, false) and v_subtotal >= coalesce(v_free_shipping_min_amount, 0);
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

  -- Campaign free-shipping and the new sitewide threshold both top up the
  -- discount by whatever of the delivery fee isn't already waived by a
  -- free_shipping coupon -- never a second full v_delivery_fee stacked on
  -- top of one already granted, whichever of the two (or both) applies.
  if (v_free_shipping_from_campaign or v_free_shipping_from_threshold) and v_delivery_fee > 0 then
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
