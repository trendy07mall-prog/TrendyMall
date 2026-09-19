-- "Shop by Brand" homepage section + /brand/[slug] and /brands pages.
--
-- Additive only, and deliberately NOT a new table: brands already exists
-- (sql/046_brands.sql) with name/slug/description/image_path/is_active, and
-- products.brand_id is already a real FK to it, already backfilled, already
-- indexed, and already what every filter/facet query reads. This only adds
-- the three presentation columns that section needs.
--
-- description and image_path are reused as the brand page's intro copy and
-- its logo rather than adding parallel intro_copy/logo_url columns: both are
-- null for every brand today, both already have admin UI in BrandForm.tsx,
-- and two columns meaning the same thing is how they drift apart.

-- wordmark = render the brand's NAME as styled text. logo = render
-- image_path. Defaulting every existing and future row to 'wordmark' is the
-- trademark-safe default: a brand only renders pictorially when someone
-- deliberately sets this, never merely because an image got uploaded. The
-- app layer enforces the same rule a second time (see lib/brand-display.ts),
-- so a row set to 'logo' with no image still falls back to text rather than
-- rendering an empty tile.
alter table public.brands
  add column if not exists display_style text not null default 'wordmark'
    check (display_style in ('logo', 'wordmark'));

-- Controls inclusion in the homepage grid only. The /brands directory lists
-- every active brand regardless.
alter table public.brands
  add column if not exists is_featured boolean not null default false;

alter table public.brands
  add column if not exists sort_order integer not null default 0;

-- ---------------------------------------------------------------------
-- One-time casing cleanup.
--
-- These names came from the sql/046 backfill, which took whatever casing
-- had been typed into the old free-text products.brand column. They are
-- about to become page <title>s and on-page wordmarks, so they are fixed
-- now rather than after anything is indexed.
--
-- SLUGS ARE DELIBERATELY NOT TOUCHED. They are already correctly
-- lowercased ('jbl', 'vintage-t9', 'budget-oriented-house'), they are the
-- URL, and the /shop brand facet resolves a name to an id case-
-- insensitively (toProductListFilters lowercases both sides), so an
-- existing ?brands=jbl link keeps working after the rename.
--
-- Only clearly-wrong casing is corrected. Names that are already properly
-- cased or are genuine stylisations (AIWA, GTS, TWS, Geemy, Vendens,
-- Music, Apple, Lenovo, Marshall, No Brand) are left exactly as they are
-- rather than churned on a guess.
update public.brands set name = 'JBL' where slug = 'jbl' and name <> 'JBL';
update public.brands set name = 'Vintage T9' where slug = 'vintage-t9' and name <> 'Vintage T9';
update public.brands set name = 'Budget-Oriented House'
  where slug = 'budget-oriented-house' and name <> 'Budget-Oriented House';

-- products.brand is a denormalised MIRROR of brands.name, kept in sync by
-- the app's dual-write (resolveBrandId in lib/admin/products.ts) on every
-- product edit -- but a rename here is not a product edit, so the mirror
-- would silently keep the old casing and surface it on the product card,
-- the spec table and the PDP's JSON-LD. Re-synced for every product whose
-- mirror no longer matches its own brand row.
update public.products p
set brand = b.name
from public.brands b
where p.brand_id = b.id
  and p.brand is distinct from b.name;

-- ---------------------------------------------------------------------
-- Seed the homepage grid so it is populated on first deploy rather than
-- empty until someone curates it.
--
-- Every active brand is featured except "No Brand", which is the bucket
-- for products with no real brand and is not something to shop by.
update public.brands
set is_featured = true
where is_active = true and lower(trim(name)) <> 'no brand';

update public.brands set is_featured = false where lower(trim(name)) = 'no brand';

-- sort_order = most products first, ties broken alphabetically, so the
-- grid opens on the brands with the most to show. Counts only genuinely
-- live products, the same status='published' AND is_deleted=false
-- predicate used everywhere else products are counted. This is a one-time
-- seed, not a maintained value -- sort_order is a hand-curation knob from
-- here on, and nothing recomputes it.
with ranked as (
  select
    b.id,
    row_number() over (
      order by count(p.id) desc, lower(b.name) asc
    ) as position
  from public.brands b
  left join public.products p
    on p.brand_id = b.id
   and p.status = 'published'
   and p.is_deleted = false
  group by b.id, b.name
)
update public.brands b
set sort_order = ranked.position
from ranked
where b.id = ranked.id;

create index if not exists brands_featured_idx
  on public.brands(is_featured, sort_order)
  where is_active = true;
