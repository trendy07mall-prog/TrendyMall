-- Up to 4 images per color variant (was a single variant_image_url text
-- column). Additive/reversible: variant_image_url stays untouched as a
-- legacy fallback -- every existing variant keeps rendering exactly as
-- before until an admin re-saves it with a new multi-image set.

create table public.product_variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_variant_images_variant_id_idx on public.product_variant_images(variant_id);

alter table public.product_variant_images enable row level security;

-- Same shape as product_images/product_variants: readable if the parent
-- product is published (or the caller is admin), write is admin-only.
create policy "product_variant_images_select_published_or_admin" on public.product_variant_images
  for select using (
    exists (
      select 1 from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = product_variant_images.variant_id
        and (p.status = 'published' or public.is_admin())
    )
  );

create policy "product_variant_images_insert_admin" on public.product_variant_images
  for insert with check (public.is_admin());

create policy "product_variant_images_update_admin" on public.product_variant_images
  for update using (public.is_admin());

create policy "product_variant_images_delete_admin" on public.product_variant_images
  for delete using (public.is_admin());

-- One-time backfill: every existing single variant image becomes the first
-- (sort_order 0) row in the new table, so the gallery-swap behavior works
-- immediately for already-saved variants without requiring a re-save.
insert into public.product_variant_images (variant_id, image_url, sort_order)
select id, variant_image_url, 0
from public.product_variants
where variant_image_url is not null;

-- Non-color attribute selections (e.g. "MAH: 5000mah") are recorded on the
-- order for reference, the same snapshot pattern already used for
-- variant_name/variant_color_hex -- no price/stock impact, purely display.
alter table public.order_items
  add column attribute_selections jsonb;
