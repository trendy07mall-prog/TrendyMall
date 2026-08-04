-- Stage 6 (final stage of the catalog roadmap): real price/SKU per variant,
-- and variant-awareness for cart_items/order_items. All additive/nullable —
-- nothing existing is dropped, renamed, or backfilled with a guess, so
-- every product/cart/order that predates this migration keeps working
-- exactly as it does today (every new column defaults to/allows null).

-- ── product_variants: price + SKU ───────────────────────────────────────
-- price null means "same as the product's effective price" (see
-- getEffectiveVariantPrice in app code) — not every variant needs its own
-- price, so this is opt-in per row, same spirit as the existing nullable
-- stock column.

alter table public.product_variants
  add column price numeric(10,2) check (price is null or price >= 0),
  add column sku text;

create unique index product_variants_sku_key
  on public.product_variants (sku) where sku is not null;

-- ── cart_items: variant-aware identity ──────────────────────────────────
-- variant_id cascades: a cart line pinned to a color that no longer exists
-- is meaningless, so deleting a variant removes just that line — the same
-- behavior product_id's existing cascade already gives for a deleted
-- product.

alter table public.cart_items
  add column variant_id uuid references public.product_variants(id) on delete cascade;

-- Postgres treats every NULL as distinct for uniqueness purposes, so a
-- plain (user_id, product_id, variant_id) constraint would let a
-- non-variant product accumulate duplicate cart_items rows (every NULL
-- variant_id counts as "different"). Fix: a stored generated column that
-- coalesces null down to a fixed sentinel UUID, and constrain on that
-- instead — this also doubles as a clean onConflict target for
-- lib/cart-sync.ts's upserts.
alter table public.cart_items
  add column variant_key uuid generated always as
    (coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored;

alter table public.cart_items
  drop constraint cart_items_user_id_product_id_key;
alter table public.cart_items
  add constraint cart_items_user_product_variant_key unique (user_id, product_id, variant_key);

-- ── order_items: variant snapshot + reference ───────────────────────────
-- variant_name/variant_color_hex already exist (sql/020) but have never
-- been written to — this stage is what finally populates them. variant_id
-- is purely a reference for "buy again" (lib/orders/reorder.ts) — ON
-- DELETE SET NULL so deleting a variant never touches a historical order
-- line, it only loses the ability to re-select the same color on reorder.

alter table public.order_items
  add column variant_id uuid references public.product_variants(id) on delete set null;
