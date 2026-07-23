-- RLS for the product catalog upgrade (sql/008).
-- Run this after sql/008_product_catalog_schema.sql.

-- products: public can only see published products; admins see everything
-- (needed for the admin product list/edit pages, which show drafts too).
drop policy if exists "products_select_all" on public.products;

create policy "products_select_published_or_admin" on public.products
  for select using (status = 'published' or public.is_admin());

-- insert/update/delete admin policies on products are unchanged from
-- sql/002_rls_policies.sql (products_insert_admin / _update_admin / _delete_admin).

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
alter table public.product_images enable row level security;

create policy "product_images_select_published_or_admin" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.status = 'published' or public.is_admin())
    )
  );

create policy "product_images_insert_admin" on public.product_images
  for insert with check (public.is_admin());

create policy "product_images_update_admin" on public.product_images
  for update using (public.is_admin());

create policy "product_images_delete_admin" on public.product_images
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------------
alter table public.product_variants enable row level security;

create policy "product_variants_select_published_or_admin" on public.product_variants
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.status = 'published' or public.is_admin())
    )
  );

create policy "product_variants_insert_admin" on public.product_variants
  for insert with check (public.is_admin());

create policy "product_variants_update_admin" on public.product_variants
  for update using (public.is_admin());

create policy "product_variants_delete_admin" on public.product_variants
  for delete using (public.is_admin());
