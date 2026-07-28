-- Payment & Order Management System (v10), Phase 2 — atomic, server-priced
-- order creation. Small delta on top of sql/020 (widens delivery_method,
-- confirmed to include Store Pickup) plus the create_order_atomic RPC.

alter table public.orders drop constraint orders_delivery_method_check;
alter table public.orders add constraint orders_delivery_method_check
  check (delivery_method in ('standard', 'pickup'));

-- Re-prices every line from the live products table (never trusts the
-- caller), reduces stock atomically per line via reduce_stock() from
-- sql/020, computes the delivery fee server-side from the shipping
-- district, and rejects if the client's last-rendered total has drifted.
-- Everything here runs inside one implicit transaction: any raised
-- exception rolls back the whole call, so a mid-loop stock failure never
-- leaves a partial order behind.
create or replace function public.create_order_atomic(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_first_name text,
  p_shipping_last_name text,
  p_shipping_street text,
  p_shipping_city text,
  p_shipping_district text,
  p_shipping_postal_code text,
  p_delivery_method text,
  p_payment_method text,
  p_notes text,
  p_items jsonb,
  p_client_total numeric
) returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2);
  v_total numeric(10,2);
  v_order_id uuid;
  v_order_number text;
  v_street text;
  v_city text;
  v_district text;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to place an order.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;
  if p_delivery_method not in ('standard', 'pickup') then
    raise exception 'Invalid delivery method.';
  end if;

  -- Pass 1: re-price every line from the live products table and reduce
  -- stock atomically. Never reads price/name from the caller.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid quantity.';
    end if;

    select id, name, actual_price, special_price, is_deleted, status
    into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

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
  if p_delivery_method = 'pickup' then
    v_delivery_fee := 0;
    v_street := 'Salawatta Road';
    v_city := 'Wellampitiya';
    v_district := 'Colombo';
  else
    v_delivery_fee := case when p_shipping_district in ('Colombo','Gampaha','Kalutara') then 255 else 400 end;
    v_street := p_shipping_street;
    v_city := p_shipping_city;
    v_district := p_shipping_district;
  end if;

  v_total := v_subtotal + v_delivery_fee;

  if p_client_total is not null and abs(p_client_total - v_total) > 0.01 then
    raise exception 'Prices have changed — please refresh your cart and try again.';
  end if;

  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone, shipping_address,
    subtotal, shipping_fee, discount, total, delivery_method, payment_method, notes
  ) values (
    v_user_id, p_customer_name, p_customer_email, p_customer_phone,
    v_street || ', ' || v_city || ', ' || v_district
      || coalesce(nullif(', ' || p_shipping_postal_code, ', '), ''),
    v_subtotal, v_delivery_fee, 0, v_total, p_delivery_method, p_payment_method, p_notes
  )
  returning id, order_number into v_order_id, v_order_number;

  insert into public.shipping_addresses (
    order_id, first_name, last_name, phone, email, street, city, district, postal_code
  ) values (
    v_order_id, p_shipping_first_name, p_shipping_last_name, p_customer_phone, p_customer_email,
    v_street, v_city, v_district, case when p_delivery_method = 'pickup' then null else p_shipping_postal_code end
  );

  -- Pass 2: now that order_id exists, insert the priced+snapshotted lines.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;

    select p.id, p.name, p.actual_price, p.special_price,
           (select pi.image_url from public.product_images pi
            where pi.product_id = p.id order by pi.sort_order limit 1) as image_url
    into v_product
    from public.products p
    where p.id = (v_item->>'product_id')::uuid;

    insert into public.order_items (
      order_id, product_id, product_name, unit_price, quantity, subtotal, product_image_url
    ) values (
      v_order_id, v_product.id, v_product.name,
      coalesce(v_product.special_price, v_product.actual_price), v_quantity,
      coalesce(v_product.special_price, v_product.actual_price) * v_quantity,
      v_product.image_url
    );
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.create_order_atomic to authenticated;
