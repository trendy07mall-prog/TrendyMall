-- Stage 5 of the catalog architecture roadmap: product attributes with
-- dynamic storefront filters (Color/Size/Storage). Color is seeded with a
-- one-time backfill from today's real product_variants.color_name data so
-- the filter works immediately -- but this is NOT an ongoing sync.
-- product_variants and the PDP swatch picker stay completely untouched;
-- unifying them with a real attribute system is Stage 6's job.

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  value text not null,
  slug text not null unique,
  -- Optional -- only meaningful for Color-type attributes, reuses the exact
  -- same format check product_variants.color_hex already has, for the same
  -- swatch-rendering purpose. Null for Size/Storage-style values.
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index attribute_values_attribute_id_idx on public.attribute_values(attribute_id);

-- attribute_value_id deliberately has NO "on delete cascade" -- same lesson
-- as product_tags.tag_id (Stage 3, fixed in sql/048) and
-- product_spec_values.spec_field_id (Stage 4, correct from the start):
-- deleting a value that's still assigned to products is blocked, not
-- silently cascaded away.
create table public.product_attribute_values (
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_value_id uuid not null references public.attribute_values(id),
  created_at timestamptz not null default now(),
  primary key (product_id, attribute_value_id)
);
create index product_attribute_values_value_id_idx on public.product_attribute_values(attribute_value_id);

alter table public.attributes enable row level security;
alter table public.attribute_values enable row level security;
alter table public.product_attribute_values enable row level security;

create policy "attributes_select_all" on public.attributes
  for select using (true);
create policy "attributes_insert_admin" on public.attributes
  for insert with check (public.is_admin());
create policy "attributes_update_admin" on public.attributes
  for update using (public.is_admin());
create policy "attributes_delete_admin" on public.attributes
  for delete using (public.is_admin());

create policy "attribute_values_select_all" on public.attribute_values
  for select using (true);
create policy "attribute_values_insert_admin" on public.attribute_values
  for insert with check (public.is_admin());
create policy "attribute_values_update_admin" on public.attribute_values
  for update using (public.is_admin());
create policy "attribute_values_delete_admin" on public.attribute_values
  for delete using (public.is_admin());

create policy "product_attribute_values_select_all" on public.product_attribute_values
  for select using (true);
create policy "product_attribute_values_insert_admin" on public.product_attribute_values
  for insert with check (public.is_admin());
create policy "product_attribute_values_delete_admin" on public.product_attribute_values
  for delete using (public.is_admin());
-- No update policy -- values are replaced via delete-then-insert
-- (setProductAttributeValues), same as product_tags/setProductTags.

-- Seed the 3 example attributes. Size/Storage start empty -- no existing
-- data, admins assign values going forward (same pattern as Stage 3's
-- empty "Best Seller"/"New Arrival" tags).
insert into public.attributes (name, slug, sort_order) values ('Color', 'color', 0);
insert into public.attributes (name, slug, sort_order) values ('Size', 'size', 1);
insert into public.attributes (name, slug, sort_order) values ('Storage', 'storage', 2);

-- Backfill Color from today's real product_variants.color_name data --
-- same case-insensitive-dedup, most-frequent-casing-wins approach Stage 2
-- used for brands.
insert into public.attribute_values (attribute_id, value, slug, color_hex)
select distinct on (lower(trim(v.color_name)))
  (select id from public.attributes where slug = 'color'),
  trim(v.color_name),
  trim(both '-' from regexp_replace(lower(trim(v.color_name)), '[^a-z0-9]+', '-', 'g')),
  v.color_hex
from public.product_variants v
order by lower(trim(v.color_name)), (
  select count(*) from public.product_variants v2
  where lower(trim(v2.color_name)) = lower(trim(v.color_name))
) desc, v.created_at asc;

insert into public.product_attribute_values (product_id, attribute_value_id)
select distinct pv.product_id, av.id
from public.product_variants pv
join public.attribute_values av
  on lower(trim(av.value)) = lower(trim(pv.color_name))
  and av.attribute_id = (select id from public.attributes where slug = 'color');
