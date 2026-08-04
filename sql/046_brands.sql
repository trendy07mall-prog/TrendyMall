-- Stage 2 of the catalog architecture roadmap: brand management.
-- Additive only -- products.brand (text) is left untouched; a new nullable
-- brand_id FK is added alongside it and backfilled. See the app layer for
-- the dual-write that keeps both in sync going forward.

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column brand_id uuid references public.brands(id);
create index products_brand_id_idx on public.products(brand_id);

alter table public.brands enable row level security;

create policy "brands_select_all" on public.brands
  for select using (true);
create policy "brands_insert_admin" on public.brands
  for insert with check (public.is_admin());
create policy "brands_update_admin" on public.brands
  for update using (public.is_admin());
create policy "brands_delete_admin" on public.brands
  for delete using (public.is_admin());

-- Backfill: one brands row per distinct normalized (trim+lower) existing
-- value. Canonical display casing = the most-frequent exact casing seen
-- for that normalized value (ties broken by earliest created_at), so a
-- single admin typo doesn't win over the commonly-used casing.
insert into public.brands (name, slug)
select distinct on (lower(trim(b.brand)))
  trim(b.brand),
  trim(both '-' from regexp_replace(lower(trim(b.brand)), '[^a-z0-9]+', '-', 'g'))
from public.products b
where b.brand is not null and trim(b.brand) <> ''
order by lower(trim(b.brand)), (
  select count(*) from public.products p2
  where lower(trim(p2.brand)) = lower(trim(b.brand))
) desc, b.created_at asc;

update public.products p
set brand_id = br.id
from public.brands br
where p.brand is not null and lower(trim(p.brand)) = lower(br.name);
