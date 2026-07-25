-- Search, filter, and sort upgrade:
--   - full-text search (tsvector + GIN) across name/brand/sku/keywords/description
--   - view_count for "Most Popular" sort
--   - service flags for the "Service" filter group
--   - product_sales_summary view for "Best Selling" sort
-- (Reviews/ratings already exist from sql/013_reviews.sql — reused, not
-- duplicated, for the Rating filter and Highest Rated sort.)

alter table public.products
  add column keywords text,
  add column view_count integer not null default 0,
  add column cod_available boolean not null default true,
  add column free_delivery boolean not null default false,
  add column warranty_available boolean not null default false;

-- Generated column: can't reference other tables (e.g. category name), so
-- it only covers the product's own text fields. description is stored as
-- sanitized HTML — strip tags before indexing so markup doesn't pollute
-- the search vector. Weighted: name highest, brand/sku/keywords next,
-- description lowest.
alter table public.products
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(brand, '') || ' ' || coalesce(sku, '') || ' ' || coalesce(keywords, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(regexp_replace(description, '<[^>]+>', ' ', 'g'), '')), 'C')
  ) stored;

create index products_search_vector_idx on public.products using gin(search_vector);

-- Best Selling sort: units sold per product across all order_items,
-- regardless of order status (same simplification used for the admin
-- dashboard's best-sellers list).
create view public.product_sales_summary as
  select product_id, sum(quantity) as units_sold
  from public.order_items
  where product_id is not null
  group by product_id;

-- Atomic increment for "Most Popular" — avoids a read-then-write race
-- under concurrent product-page visits. security definer so it works from
-- the anon/authenticated role without a broader products UPDATE policy.
create or replace function public.increment_product_view_count(p_product_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products set view_count = view_count + 1 where id = p_product_id;
$$;

revoke all on function public.increment_product_view_count(uuid) from public;
grant execute on function public.increment_product_view_count(uuid) to anon, authenticated;
