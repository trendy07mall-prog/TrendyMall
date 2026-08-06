-- Pricing-migration step 1 of 2: purely additive/non-destructive prep.
-- Adds the new product_variants columns needed to backfill every product
-- with a real, priced default variant, and relaxes color_name/color_hex to
-- nullable so a true "default, no color to show" variant is representable.
-- Nothing existing is dropped or renamed here -- that happens in
-- sql/060_variant_pricing_finalize.sql, only after the backfilled data
-- (inserted via the app's service-role client, not SQL) has been reviewed.

alter table public.product_variants
  add column sale_price numeric(10,2)
    check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  add column is_default boolean not null default false,
  add column is_active boolean not null default true;

alter table public.product_variants alter column color_name drop not null;
alter table public.product_variants alter column color_hex drop not null;

-- Exactly one default variant per product, once is_default starts getting
-- set during backfill.
create unique index product_variants_one_default_per_product
  on public.product_variants(product_id) where is_default;
