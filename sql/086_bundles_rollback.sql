-- ROLLBACK for sql/085_bundles.sql.
--
-- Undoes the bundle feature completely and touches nothing else. Safe to
-- run even if sql/085 was only partly applied: every step is guarded.
--
-- BEFORE RUNNING THIS, if any bundle was ever published and sold:
--   1. Unpublish every bundle in admin first (Products -> filter Bundles).
--      Dropping product_kind below turns any remaining bundle row into an
--      ordinary product whose stock number was never maintained, which
--      would then be sellable at the bundle price with no stock control.
--   2. Note that dropping order_items.bundle_id loses the marker that
--      said which lines were bundle CONTENTS. Those zero-priced rows stay
--      on the order and would then show as ordinary Rs 0 items. The order
--      total and the money reports are unaffected either way, because
--      revenue comes from the order total, never from adding up lines.
--
-- The function goes back FIRST, so that by the time the columns are
-- dropped nothing refers to them.

-- ── 1. create_order_atomic, back to the sql/082 version, verbatim ──────
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
  p_client_shipping_fee numeric default null,
  p_shipping_zone_key text default null
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
    -- Explicit zone selection comes first and matches on the key ALONE --
    -- never on a postal-code range. A town the customer picks by name can
    -- then be priced without anyone (customer or admin) having to decide
    -- which numeric range it "counts as", which is the ambiguity that put
    -- three Wellampitiya orders on the outside-zone rate.
    if p_shipping_zone_key is not null and trim(p_shipping_zone_key) <> '' then
      select z.rate into v_delivery_fee
      from public.delivery_zones z
      where z.status = 'active' and z.zone_key = p_shipping_zone_key
      order by z.sort_order
      limit 1;
    end if;

    -- Range matching now deliberately skips key-based zones (zone_key is
    -- not null), so an explicit-selection zone can never be reached by a
    -- postal code that happens to fall inside some range. The two kinds of
    -- zone stay strictly separate.
    if v_delivery_fee is null then
      select z.rate into v_delivery_fee
      from public.delivery_zones z
      where z.status = 'active' and z.is_default = false and z.zone_key is null
        and (z.district_match is null or z.district_match = p_shipping_district)
        and z.postal_code_start is not null and z.postal_code_end is not null
        and public.normalize_postal_code(p_shipping_postal_code) between z.postal_code_start and z.postal_code_end
      order by z.sort_order
      limit 1;
    end if;

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
          'district', p_shipping_district, 'postalCode', p_shipping_postal_code,
          'zoneKey', p_shipping_zone_key
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
    order_id, first_name, last_name, phone, email, street, city, district, postal_code, source_address_id,
    zone_key
  )
  values (
    v_order_id, p_shipping_first_name, p_shipping_last_name, p_customer_phone, p_customer_email,
    v_street, v_city, v_district, case when p_delivery_method = 'pickup' then null else p_shipping_postal_code end,
    p_source_address_id,
    case when p_delivery_method = 'pickup' then null else nullif(trim(coalesce(p_shipping_zone_key, '')), '') end
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

-- ── 2. the sales view, back to counting every line ────────────────────
create or replace view public.product_sales_summary as
  select product_id, sum(quantity) as units_sold
  from public.order_items
  where product_id is not null
  group by product_id;


-- ── 3. read side: the four functions back to their pre-085 text ────────
-- Byte-for-byte the definitions that were live before sql/085 ran, taken
-- from the backup made the same night. They must go back BEFORE
-- order_items.bundle_id is dropped below, which is why this section comes
-- first.

CREATE OR REPLACE FUNCTION public.get_order_confirmation(p_order_number text, p_token uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    'couponCode', (
      select c.code from public.coupon_redemptions cr
      join public.coupons c on c.id = cr.coupon_id
      where cr.order_id = v_order.id
    ),
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
        'variantName', oi.variant_name, 'variantColorHex', oi.variant_color_hex,
        'attributeSelections', oi.attribute_selections
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

CREATE OR REPLACE FUNCTION public.get_guest_order_by_id(p_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    'couponCode', (
      select c.code from public.coupon_redemptions cr
      join public.coupons c on c.id = cr.coupon_id
      where cr.order_id = v_order.id
    ),
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
        'variantName', oi.variant_name, 'variantColorHex', oi.variant_color_hex,
        'attributeSelections', oi.attribute_selections
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

CREATE OR REPLACE FUNCTION public.track_order(p_order_number text, p_contact text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    'couponCode', (
      select c.code from public.coupon_redemptions cr
      join public.coupons c on c.id = cr.coupon_id
      where cr.order_id = v_order.id
    ),
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
        'variantName', oi.variant_name, 'variantColorHex', oi.variant_color_hex,
        'attributeSelections', oi.attribute_selections
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

CREATE OR REPLACE FUNCTION public.get_recent_top_sellers(p_days integer, p_limit integer) RETURNS TABLE(product_id uuid, units_sold bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select oi.product_id, sum(oi.quantity)::bigint as units_sold
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products pr on pr.id = oi.product_id
  where oi.product_id is not null
    and o.order_status = 'delivered'
    and o.created_at >= now() - make_interval(days => p_days)
    and pr.status = 'published'
    and pr.is_deleted = false
    and pr.stock > 0
  group by oi.product_id
  having sum(oi.quantity) > 0
  order by units_sold desc
  limit p_limit;
$$;

grant execute on function public.get_order_confirmation to authenticated, anon;
grant execute on function public.get_guest_order_by_id to authenticated, anon;
grant execute on function public.track_order to authenticated, anon;
grant execute on function public.get_recent_top_sellers to authenticated, anon;

-- ── 4. drop what sql/085 added ────────────────────────────────────────
drop index if exists public.order_items_bundle_idx;
alter table public.order_items drop column if exists bundle_id;

drop policy if exists "variant_costs_admin_all" on public.variant_costs;
drop table if exists public.variant_costs;

drop policy if exists "bundle_items_admin_write" on public.bundle_items;
drop policy if exists "bundle_items_select_all" on public.bundle_items;
drop index if exists public.bundle_items_bundle_idx;
drop table if exists public.bundle_items;

drop index if exists public.products_product_kind_idx;
alter table public.products drop column if exists product_kind;

-- Normal products are untouched by all of the above: product_kind was the
-- only thing added to them, it defaulted to 'single', and nothing else
-- read it.
