-- Captures "notify me when back in stock" email requests from the product
-- page. No automatic email is sent yet (that needs the transactional-email
-- setup planned for a later phase) — for now, view/export requests directly
-- in the Supabase table editor and mark `notified` once you've followed up.

create table public.product_stock_notifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  email text not null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_stock_notifications_product_id_idx
  on public.product_stock_notifications(product_id);

alter table public.product_stock_notifications enable row level security;

-- Anyone (including logged-out visitors) can submit a request; only admins
-- can read/manage the list.
create policy "product_stock_notifications_insert_anyone" on public.product_stock_notifications
  for insert with check (true);

create policy "product_stock_notifications_select_admin" on public.product_stock_notifications
  for select using (public.is_admin());

create policy "product_stock_notifications_update_admin" on public.product_stock_notifications
  for update using (public.is_admin());

create policy "product_stock_notifications_delete_admin" on public.product_stock_notifications
  for delete using (public.is_admin());
