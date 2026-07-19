-- TrendyMall row-level security policies
-- Run this after sql/001_schema.sql.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: a user can see/update their own row; admins can see/update any row.
-- Direct inserts are admin-only (normal signups go through the
-- handle_new_user() trigger, which runs as security definer).
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_admin_only" on public.profiles
  for insert with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- categories: public read, admin write
-- ---------------------------------------------------------------------------
create policy "categories_select_all" on public.categories
  for select using (true);

create policy "categories_insert_admin" on public.categories
  for insert with check (public.is_admin());

create policy "categories_update_admin" on public.categories
  for update using (public.is_admin());

create policy "categories_delete_admin" on public.categories
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- products: public read, admin write
-- ---------------------------------------------------------------------------
create policy "products_select_all" on public.products
  for select using (true);

create policy "products_insert_admin" on public.products
  for insert with check (public.is_admin());

create policy "products_update_admin" on public.products
  for update using (public.is_admin());

create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- orders: a customer sees/creates only their own orders; admins see/update all.
-- A customer may additionally cancel their own still-pending order.
-- ---------------------------------------------------------------------------
create policy "orders_select_own_or_admin" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "orders_update_admin" on public.orders
  for update using (public.is_admin());

create policy "orders_customer_cancel_own_pending" on public.orders
  for update using (auth.uid() = user_id and status = 'pending_payment')
  with check (status = 'cancelled');

-- ---------------------------------------------------------------------------
-- order_items: visible/insertable only through an order the user owns;
-- admins have full access.
-- ---------------------------------------------------------------------------
create policy "order_items_select_own_or_admin" on public.order_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

create policy "order_items_insert_own_order" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

create policy "order_items_admin_update" on public.order_items
  for update using (public.is_admin());

create policy "order_items_admin_delete" on public.order_items
  for delete using (public.is_admin());
