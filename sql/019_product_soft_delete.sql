-- Safety fix, run before any admin dashboard UI work: product deletion must
-- never destroy order history. Soft-deletes products instead of hard
-- deleting them, and lets order_items carry an image snapshot so a deleted
-- or later-changed product still renders correctly on past orders.

alter table public.products
  add column is_deleted boolean not null default false;

create index products_is_deleted_idx on public.products (is_deleted);

alter table public.order_items
  add column product_image_url text;

-- Best-effort backfill for orders placed before this column existed: pull
-- the CURRENT primary image for products that still exist. This is not a
-- true "image at time of purchase" (that data was never captured), but it's
-- better than leaving historical rows blank. Every order placed from now on
-- captures the real snapshot at checkout time via lib/orders.ts.
update public.order_items oi
set product_image_url = pi.image_url
from (
  select distinct on (product_id) product_id, image_url
  from public.product_images
  order by product_id, sort_order asc
) pi
where oi.product_id = pi.product_id
  and oi.product_image_url is null;

-- Defense in depth: even if application code ever forgets the is_deleted
-- filter, a soft-deleted product must never be selectable by a non-admin at
-- the RLS layer. Replaces the policy from sql/009_product_catalog_rls.sql.
drop policy if exists "products_select_published_or_admin" on public.products;

create policy "products_select_published_or_admin" on public.products
  for select using (
    (status = 'published' and is_deleted = false) or public.is_admin()
  );
