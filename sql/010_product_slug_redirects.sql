-- Tracks old product slugs so links to a renamed/re-slugged product 301
-- redirect to its current URL instead of 404ing. Populated automatically by
-- lib/admin/products.ts whenever an admin edit changes an existing slug.

create table public.product_slug_redirects (
  old_slug text primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index product_slug_redirects_product_id_idx
  on public.product_slug_redirects(product_id);

alter table public.product_slug_redirects enable row level security;

create policy "product_slug_redirects_select_all" on public.product_slug_redirects
  for select using (true);

create policy "product_slug_redirects_insert_admin" on public.product_slug_redirects
  for insert with check (public.is_admin());

create policy "product_slug_redirects_update_admin" on public.product_slug_redirects
  for update using (public.is_admin());

create policy "product_slug_redirects_delete_admin" on public.product_slug_redirects
  for delete using (public.is_admin());
