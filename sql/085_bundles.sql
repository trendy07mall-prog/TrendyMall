-- BUNDLES: 2-3 existing products sold together for one price.
--
-- The shape of this, and why
-- --------------------------
-- A bundle is a NORMAL products row with product_kind = 'bundle', holding
-- exactly one option that carries the bundle price, plus rows in
-- bundle_items saying what is inside. It is not a separate kind of thing
-- with its own route, cart type and checkout path.
--
-- That is the whole point. To the shop grid, the product page, the cart,
-- the Meta pixel and every order screen, a bundle simply IS a product, so
-- all of them keep working untouched -- and it gets its own URL for free,
-- which is what a per-bundle ad needs. The alternative (a parallel
-- "bundle" entity) would have meant touching the cart model, checkout and
-- order display, which is a great deal of risk to take on a live store
-- running paid traffic.
--
-- Everything here is additive: new columns with defaults, new tables, and
-- one branch inside create_order_atomic. A normal product's path through
-- that function is unchanged -- verified line by line when this was
-- generated, and covered by tests.

-- ── 1. what kind of product is this ────────────────────────────────────
-- Defaults to 'single', so every existing row keeps behaving exactly as
-- it does today without being touched.
alter table public.products
  add column if not exists product_kind text not null default 'single'
    check (product_kind in ('single', 'bundle'));

create index if not exists products_product_kind_idx
  on public.products(product_kind) where product_kind = 'bundle';

-- ── 2. what is inside each bundle ──────────────────────────────────────
-- The option is pinned, not chosen by the customer (v1): the shop owner
-- picks the exact colour that goes in the box, so what is promised on the
-- page is what is packed and what comes out of stock.
create table if not exists public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_product_id uuid not null references public.products(id) on delete cascade,
  item_product_id uuid not null references public.products(id) on delete restrict,
  item_variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- The same option twice in one bundle would be two rows fighting over
  -- the same stock; quantity is how you ask for two.
  unique (bundle_product_id, item_variant_id)
);

-- on delete cascade from the bundle: deleting a bundle removes its
-- contents list. on delete restrict from the item: a product that is
-- inside a live bundle cannot be deleted out from under it.

create index if not exists bundle_items_bundle_idx
  on public.bundle_items(bundle_product_id);

alter table public.bundle_items enable row level security;

-- Readable by anyone: the storefront has to render what is in the box.
drop policy if exists "bundle_items_select_all" on public.bundle_items;
create policy "bundle_items_select_all" on public.bundle_items
  for select using (true);

drop policy if exists "bundle_items_admin_write" on public.bundle_items;
create policy "bundle_items_admin_write" on public.bundle_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 3. cost prices, admin-only ─────────────────────────────────────────
-- A separate table rather than a column on product_variants, and that is
-- a security decision, not tidiness: product_variants is readable by
-- everyone (the storefront needs prices and stock), so a cost column
-- there would be one API call away from any customer. Here, the only
-- policy is an admin one, so there is no path to it at all.
create table if not exists public.variant_costs (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  cost numeric(10,2) not null check (cost >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.variant_costs enable row level security;

-- Deliberately no select policy for anyone but an admin.
drop policy if exists "variant_costs_admin_all" on public.variant_costs;
create policy "variant_costs_admin_all" on public.variant_costs
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 4. marking the contents lines on an order ──────────────────────────
-- A bundle writes one priced line (the bundle) plus one zero-priced line
-- per item inside. bundle_id is null on everything else, including every
-- order that already exists, so nothing changes for normal orders.
--
-- Those zero lines are why cancelling a bundle needs NO change to
-- cancel_order_atomic: it already restores stock by walking order_items,
-- and the contents are now order_items.
alter table public.order_items
  add column if not exists bundle_id uuid references public.products(id) on delete set null;

create index if not exists order_items_bundle_idx
  on public.order_items(bundle_id) where bundle_id is not null;

-- ── 5. keep the contents out of sales figures ──────────────────────────
-- "Best selling" counts units from order_items. Without this, every item
-- inside a bundle would be counted again at zero revenue, so a bundle
-- would quietly inflate its components' sales numbers.
-- The bundle itself still counts, through its own priced line.
create or replace view public.product_sales_summary as
  select product_id, sum(quantity) as units_sold
  from public.order_items
  where product_id is not null
    and bundle_id is null
  group by product_id;

-- ── 6. order creation: one branch, nothing else ────────────────────────
-- Reproduced from sql/082 with the bundle branch added. The signature is
-- unchanged, so this replaces the function in place with no DROP and no
-- window in which checkout has no function to call.
--
-- What changed, and nothing else did:
--   * two product SELECTs now also read product_kind;
--   * stock reduction branches: a bundle reduces each item inside
--     (quantity x order quantity), a normal product runs the identical
--     statements it ran before;
--   * a bundle never takes a campaign price (v1: no discount stacking);
--   * a bundle additionally writes its contents as zero-priced lines.

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
  -- Bundles only. Untouched and unread for a normal product.
  v_bundle_item record; v_bundle_variant_stock integer;
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
    select pr.id, pr.name, pr.is_deleted, pr.status, pr.product_kind into v_product
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

    if v_product.product_kind = 'bundle' then
      -- A bundle holds no stock of its own: what is really being sold is
      -- the items inside it, so those are what must come out of stock.
      -- The bundle's own stock field is deliberately never touched or
      -- read -- availability is computed live from these same items
      -- (lib/bundles.ts), so there is no second number to drift.
      for v_bundle_item in
        select bi.item_product_id, bi.item_variant_id, bi.quantity, p2.name as item_name
        from public.bundle_items bi
        join public.products p2 on p2.id = bi.item_product_id
        where bi.bundle_product_id = v_product.id
        order by bi.sort_order
      loop
        if not public.reduce_stock(v_bundle_item.item_product_id,
                                   v_bundle_item.quantity * v_quantity) then
          raise exception 'Not enough stock for % (inside %).',
            v_bundle_item.item_name, v_product.name;
        end if;

        select pv2.stock into v_bundle_variant_stock
        from public.product_variants pv2 where pv2.id = v_bundle_item.item_variant_id;

        if v_bundle_variant_stock is not null then
          if not public.reduce_variant_stock(v_bundle_item.item_variant_id,
                                             v_bundle_item.quantity * v_quantity) then
            raise exception 'Not enough stock for % (inside %).',
              v_bundle_item.item_name, v_product.name;
          end if;
        end if;
      end loop;
    else
      if not public.reduce_stock(v_product.id, v_quantity) then
        raise exception 'Not enough stock for %.', v_product.name;
      end if;
      if v_variant_stock is not null then
        if not public.reduce_variant_stock(v_variant_id, v_quantity) then
          raise exception 'Not enough stock for %.', v_product.name;
        end if;
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

    -- v1 keeps bundles out of promotions entirely, so a bundle price can
    -- never be discounted a second time by a campaign.
    if v_product.product_kind = 'bundle' then v_variant_campaign_price := null; end if;

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
    select pr.id, pr.name, pr.product_kind,
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

    if v_product.product_kind = 'bundle' then v_variant_campaign_id := null; end if;

    insert into public.order_items (
      order_id, product_id, product_name, unit_price, quantity, subtotal, product_image_url,
      variant_id, variant_name, variant_color_hex, attribute_selections, campaign_id
    )
    values (
      v_order_id, v_product.id, v_product.name,
      v_variant_unit_price, v_quantity, v_variant_unit_price * v_quantity, v_product.image_url,
      v_variant_id, v_variant_color_name, v_variant_color_hex, v_item->'attribute_selections', v_variant_campaign_id
    );

    if v_product.product_kind = 'bundle' then
      -- One extra row per item inside, at zero price. They exist for two
      -- reasons and carry no money:
      --   * cancel_order_atomic restores stock by walking order_items, so
      --     recording the contents here means a cancelled bundle returns
      --     each item's stock with NO change to the cancel path at all;
      --   * packing needs to know what physically goes in the parcel.
      -- bundle_id is what marks them as contents rather than purchases:
      -- every customer-facing screen renders them indented under the
      -- bundle with no price, and every money report excludes them.
      for v_bundle_item in
        select bi.item_product_id, bi.item_variant_id, bi.quantity,
               p2.name as item_name,
               pv2.color_name, pv2.color_hex,
               (select pi.image_url from public.product_images pi
                 where pi.product_id = p2.id order by pi.sort_order limit 1) as image_url
        from public.bundle_items bi
        join public.products p2 on p2.id = bi.item_product_id
        left join public.product_variants pv2 on pv2.id = bi.item_variant_id
        where bi.bundle_product_id = v_product.id
        order by bi.sort_order
      loop
        insert into public.order_items (
          order_id, product_id, product_name, unit_price, quantity, subtotal,
          product_image_url, variant_id, variant_name, variant_color_hex, bundle_id
        )
        values (
          v_order_id, v_bundle_item.item_product_id, v_bundle_item.item_name,
          0, v_bundle_item.quantity * v_quantity, 0,
          v_bundle_item.image_url, v_bundle_item.item_variant_id,
          v_bundle_item.color_name, v_bundle_item.color_hex, v_product.id
        );
      end loop;
    end if;
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;
grant execute on function public.create_order_atomic to authenticated, anon;

-- ── 7. read side: tell the screens which lines are bundle contents ─────
-- Three customer-facing RPCs build an order's items as JSON. Each gains
-- ONE key, bundleId, so every screen can render those lines indented
-- under their bundle with no price instead of as Rs 0 purchases. Null on
-- every line of every order that already exists.
--
-- The text below is the live definition of each function as it stands
-- today, with that single line inserted -- taken from a verified backup
-- rather than retyped, so nothing else can have shifted. sql/086 puts
-- back the same text without the line.
--
-- get_recent_top_sellers also gains a filter, for the same reason the
-- product_sales_summary view did: a bundle's contents must not be counted
-- as sales of their own.

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
        'bundleId', oi.bundle_id,
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
        'bundleId', oi.bundle_id,
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
        'bundleId', oi.bundle_id,
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
    and oi.bundle_id is null
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

-- Rollback lives in sql/086_bundles_rollback.sql and undoes exactly this,
-- including putting create_order_atomic back to the sql/082 version.
