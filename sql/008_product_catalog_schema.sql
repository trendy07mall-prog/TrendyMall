-- Product catalog upgrade: brand/model/variants/rich descriptions/status.
-- Run this after sql/007_update_category_images.sql.

-- ---------------------------------------------------------------------------
-- products: rename price -> actual_price, add new catalog fields
-- ---------------------------------------------------------------------------
alter table public.products rename column price to actual_price;

alter table public.products
  add column special_price numeric(10,2),
  add column brand text,
  add column model text,
  add column compatible_devices text[] not null default '{}',
  add column bluetooth boolean not null default false,
  add column sku text,
  add column whats_in_box text[] not null default '{}',
  add column is_featured boolean not null default false,
  add column meta_title text,
  add column meta_description text;

alter table public.products
  add constraint products_special_price_check
  check (special_price is null or (special_price >= 0 and special_price < actual_price));

-- ---------------------------------------------------------------------------
-- status replaces is_active
-- ---------------------------------------------------------------------------
alter table public.products
  add column status text not null default 'draft' check (status in ('draft', 'published'));

update public.products
set status = case when is_active then 'published' else 'draft' end;

drop index if exists public.products_is_active_idx;
alter table public.products drop column is_active;

create index products_status_idx on public.products(status);
create index products_is_featured_idx on public.products(is_featured) where is_featured;

-- ---------------------------------------------------------------------------
-- product_images: replaces the flat images text[] array
-- ---------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images(product_id);

-- Migrate existing images[] into product_images, preserving order.
insert into public.product_images (product_id, image_url, sort_order)
select p.id, img, ord - 1
from public.products p
cross join lateral unnest(p.images) with ordinality as u(img, ord)
where p.images is not null and array_length(p.images, 1) > 0;

alter table public.products drop column images;

-- ---------------------------------------------------------------------------
-- product_variants: color variants with optional per-color stock/image
-- ---------------------------------------------------------------------------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_name text not null,
  color_hex text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  stock integer check (stock is null or stock >= 0),
  variant_image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_variants_product_id_idx on public.product_variants(product_id);
