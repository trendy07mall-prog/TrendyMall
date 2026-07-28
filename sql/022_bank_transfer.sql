-- Payment & Order Management System (v10), Phase 3 — Bank Transfer.

-- Admin-editable bank details shown at checkout. Publicly readable (it's
-- meant to be shown to any logged-in customer at checkout — not secret
-- data), admin-only write. Seeded with the real details now.
create table public.bank_transfer_settings (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  branch text not null,
  instructions text,
  updated_at timestamptz not null default now()
);
alter table public.bank_transfer_settings enable row level security;
create policy "bank_transfer_settings_select_all" on public.bank_transfer_settings for select using (true);
create policy "bank_transfer_settings_admin_write" on public.bank_transfer_settings for all using (public.is_admin()) with check (public.is_admin());

insert into public.bank_transfer_settings (bank_name, account_name, account_number, branch, instructions)
values ('Commercial Bank', 'MOHAMED ILHAM MOHAMED MAJITH', '8012646070', 'Old Moor Street', 'WhatsApp your slip to confirm faster.');

alter table public.payments add column slip_url text;

-- Private bucket for bank slips: 5MB cap + image-only, enforced by
-- Supabase Storage itself. Per-owner-folder RLS (payment-slips/<user_id>/...)
-- is the standard Supabase idiom for private per-user uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-slips', 'payment-slips', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "payment_slips_owner_insert" on storage.objects for insert with check (
  bucket_id = 'payment-slips' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "payment_slips_owner_select" on storage.objects for select using (
  bucket_id = 'payment-slips' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- Extends Phase 2's create_order_atomic. CREATE OR REPLACE does NOT
-- replace a function whose parameter list has changed shape — appending
-- new params (even with defaults) makes Postgres treat it as a distinct
-- overload, leaving the old sql/021 version in place alongside it and
-- making the later GRANT EXECUTE (with no argument list) ambiguous. Drop
-- the exact old 14-arg signature first so only one version ever exists.
drop function if exists public.create_order_atomic(
  text, text, text, text, text, text, text, text, text, text, text, text, jsonb, numeric
);

-- Branches payment_status by payment_method, requires a slip or reference
-- for bank_transfer, and now also inserts the payments row every order
-- should have had from the start of Phase 3 onward.
create or replace function public.create_order_atomic(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_shipping_first_name text, p_shipping_last_name text, p_shipping_street text,
  p_shipping_city text, p_shipping_district text, p_shipping_postal_code text,
  p_delivery_method text, p_payment_method text, p_notes text,
  p_items jsonb, p_client_total numeric,
  p_payment_reference text default null,
  p_slip_url text default null
) returns table (order_id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb; v_product record; v_quantity integer;
  v_subtotal numeric(10,2) := 0; v_delivery_fee numeric(10,2); v_total numeric(10,2);
  v_order_id uuid; v_order_number text;
  v_street text; v_city text; v_district text; v_payment_status text;
begin
  if v_user_id is null then raise exception 'You must be logged in to place an order.'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Your cart is empty.'; end if;
  if p_delivery_method not in ('standard', 'pickup') then raise exception 'Invalid delivery method.'; end if;
  if p_payment_method not in ('cod', 'bank_transfer') then raise exception 'Invalid payment method.'; end if;
  if p_payment_method = 'bank_transfer' and coalesce(nullif(trim(p_payment_reference), ''), p_slip_url) is null then
    raise exception 'Provide a bank slip or a reference number.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Invalid quantity.'; end if;
    select id, name, actual_price, special_price, is_deleted, status into v_product
    from public.products where id = (v_item->>'product_id')::uuid;
    if v_product.id is null or v_product.is_deleted or v_product.status <> 'published' then
      raise exception 'A product in your cart is no longer available.';
    end if;
    if not public.reduce_stock(v_product.id, v_quantity) then
      raise exception 'Not enough stock for %.', v_product.name;
    end if;
    v_subtotal := v_subtotal + coalesce(v_product.special_price, v_product.actual_price) * v_quantity;
  end loop;

  if p_delivery_method = 'pickup' then
    v_delivery_fee := 0; v_street := 'Salawatta Road'; v_city := 'Wellampitiya'; v_district := 'Colombo';
  else
    v_delivery_fee := case when p_shipping_district in ('Colombo','Gampaha','Kalutara') then 255 else 400 end;
    v_street := p_shipping_street; v_city := p_shipping_city; v_district := p_shipping_district;
  end if;
  v_total := v_subtotal + v_delivery_fee;
  if p_client_total is not null and abs(p_client_total - v_total) > 0.01 then
    raise exception 'Prices have changed — please refresh your cart and try again.';
  end if;

  v_payment_status := case when p_payment_method = 'bank_transfer' then 'awaiting_verification' else 'pending' end;

  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone, shipping_address,
    subtotal, shipping_fee, discount, total, delivery_method, payment_method, payment_status, notes
  ) values (
    v_user_id, p_customer_name, p_customer_email, p_customer_phone,
    v_street || ', ' || v_city || ', ' || v_district || coalesce(nullif(', ' || p_shipping_postal_code, ', '), ''),
    v_subtotal, v_delivery_fee, 0, v_total, p_delivery_method, p_payment_method, v_payment_status, p_notes
  ) returning id, order_number into v_order_id, v_order_number;

  insert into public.shipping_addresses (order_id, first_name, last_name, phone, email, street, city, district, postal_code)
  values (v_order_id, p_shipping_first_name, p_shipping_last_name, p_customer_phone, p_customer_email,
    v_street, v_city, v_district, case when p_delivery_method = 'pickup' then null else p_shipping_postal_code end);

  insert into public.payments (order_id, gateway, reference_number, slip_url, amount, currency, status)
  values (v_order_id, p_payment_method, p_payment_reference, p_slip_url, v_total, 'LKR', v_payment_status);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    select p.id, p.name, p.actual_price, p.special_price,
      (select pi.image_url from public.product_images pi where pi.product_id = p.id order by pi.sort_order limit 1) as image_url
    into v_product from public.products p where p.id = (v_item->>'product_id')::uuid;
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, subtotal, product_image_url)
    values (v_order_id, v_product.id, v_product.name, coalesce(v_product.special_price, v_product.actual_price), v_quantity,
      coalesce(v_product.special_price, v_product.actual_price) * v_quantity, v_product.image_url);
  end loop;

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.create_order_atomic to authenticated;
