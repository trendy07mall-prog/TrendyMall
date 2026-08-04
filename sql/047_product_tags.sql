-- Stage 3 of the catalog architecture roadmap: product tags.
-- Fully additive -- is_featured (column, admin checkbox, quick-toggle star,
-- storefront filter) is left completely untouched. A "Featured" tag is
-- seeded and backfilled from existing is_featured=true products so it has
-- a real, curated starting set rather than an empty table.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, tag_id)
);
create index product_tags_tag_id_idx on public.product_tags(tag_id);

alter table public.tags enable row level security;
alter table public.product_tags enable row level security;

create policy "tags_select_all" on public.tags
  for select using (true);
create policy "tags_insert_admin" on public.tags
  for insert with check (public.is_admin());
create policy "tags_update_admin" on public.tags
  for update using (public.is_admin());
create policy "tags_delete_admin" on public.tags
  for delete using (public.is_admin());

create policy "product_tags_select_all" on public.product_tags
  for select using (true);
create policy "product_tags_insert_admin" on public.product_tags
  for insert with check (public.is_admin());
create policy "product_tags_delete_admin" on public.product_tags
  for delete using (public.is_admin());
-- No update policy -- product_tags rows are never edited in place, only
-- inserted/deleted (same reasoning as coupon_redemptions having none).

-- Seed the 3 example tags from the roadmap spec. Only "Featured" gets a
-- real backfill (there's an existing flag to migrate from); "Best Seller"
-- and "New Arrival" start empty -- admins assign them by hand going
-- forward, and "New Arrival" stays a computed cutoff, not a manual tag
-- (see lib/product-filters.ts's newArrivalCutoff()).
insert into public.tags (name, slug, sort_order) values ('Featured', 'featured', 0);
insert into public.tags (name, slug, sort_order) values ('Best Seller', 'best-seller', 1);
insert into public.tags (name, slug, sort_order) values ('New Arrival', 'new-arrival', 2);

insert into public.product_tags (product_id, tag_id)
select p.id, t.id
from public.products p, public.tags t
where p.is_featured = true and t.slug = 'featured';
