-- BUNDLE STOCK, KEPT CORRECT BY THE DATABASE ITSELF.
--
-- Why this exists
-- ---------------
-- The original design left a bundle's own products.stock at 0 and worked
-- out availability live in the application instead. That was wrong in
-- practice: about ten places read products.stock directly, and two of
-- them are the cart. A bundle with stock 0 was silently dropped from the
-- cart, so a published bundle could not actually have been bought.
--
-- So products.stock on a bundle now holds the real answer -- how many
-- whole bundles can be sold, worked out from the items inside -- and the
-- database keeps it there. Nobody types this number. It is derived, so it
-- cannot drift, and every existing reader (cart, checkout, reorder,
-- favourites, admin filters, stock alerts, the in-stock facet) becomes
-- correct with no application change at all, today and for any code
-- written later.
--
-- It is recalculated whenever, and only whenever, one of the three things
-- it depends on moves:
--   1. an item's stock changes  - admin edit, an order, a cancellation,
--      a restock; it makes no difference which, because the trigger
--      watches the column, not the reason.
--   2. a bundle's contents change - an item added, removed, or its
--      quantity edited.
--   3. the bundle's own stock is written by anything at all - it is
--      recomputed and the correct value wins. This is the safety net the
--      brief asked for: a generic "restore stock" loop can never leave a
--      wrong number behind, even if some future code path forgets that
--      bundles are different.
--
-- Safe to run more than once: every object is created with `or replace`
-- or dropped first, and the backfill at the end is idempotent.

-- ── 1. the calculation ─────────────────────────────────────────────────
-- Deliberately the same arithmetic as bundleAvailability() in
-- lib/bundles.ts, so the two can never disagree:
--   * an option that tracks its own stock is limited by the lower of the
--     two numbers; one that does not (stock is null) is limited by the
--     product's number alone -- the same rule create_order_atomic follows
--     when it decides whether to reduce variant stock;
--   * a negative number counts as none;
--   * an item needed 2-per-bundle with 5 in stock supports 2 bundles, not
--     5, hence the floor division;
--   * the lowest item wins, because one empty item empties the bundle;
--   * a bundle with no contents can sell nothing.
create or replace function public.bundle_available_units(p_bundle_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    min(
      (
        case
          when pv.stock is null then greatest(0, p.stock)
          else greatest(0, least(p.stock, pv.stock))
        end
      ) / bi.quantity
    ),
    0
  )::integer
  from public.bundle_items bi
  join public.products p on p.id = bi.item_product_id
  join public.product_variants pv on pv.id = bi.item_variant_id
  where bi.bundle_product_id = p_bundle_id
    and bi.quantity > 0;
$$;

-- ── 2. writing it, and only when it actually changed ───────────────────
-- The "only when it changed" part is what stops the triggers below from
-- chasing each other: writing the same value again would fire the
-- products trigger a second time, which would compute the same value
-- again, and so on. With this guard the chain is at most two deep and
-- always terminates.
create or replace function public.sync_bundle_stock(p_bundle_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_target integer;
  v_current integer;
  v_kind text;
begin
  select pr.stock, pr.product_kind into v_current, v_kind
  from public.products pr where pr.id = p_bundle_id;

  -- Not a bundle (or gone): nothing to keep in sync. A normal product's
  -- stock is a real count of real things and is never touched here.
  if v_kind is distinct from 'bundle' then
    return;
  end if;

  v_target := public.bundle_available_units(p_bundle_id);

  if v_current is distinct from v_target then
    update public.products set stock = v_target where id = p_bundle_id;
  end if;
end;
$$;

-- ── 3. when an item's stock moves ──────────────────────────────────────
-- One trigger covers every reason a stock number can change, because it
-- watches the column rather than the cause: an admin edit, reduce_stock
-- during checkout, restore_stock during a cancellation, a restock, a CSV
-- import, a manual fix in the SQL editor.
create or replace function public.trg_sync_bundles_for_product()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_bundle uuid;
begin
  -- The bundle's own row was written by something. Recompute and let the
  -- correct value win, whatever wrote it and for whatever reason.
  if new.product_kind = 'bundle' then
    perform public.sync_bundle_stock(new.id);
    return null;
  end if;

  -- An ordinary product moved: refresh every bundle that contains it.
  for v_bundle in
    select distinct bi.bundle_product_id
    from public.bundle_items bi
    where bi.item_product_id = new.id
  loop
    perform public.sync_bundle_stock(v_bundle);
  end loop;

  return null;
end;
$$;

drop trigger if exists trg_products_sync_bundle_stock on public.products;
create trigger trg_products_sync_bundle_stock
after update of stock on public.products
for each row
execute function public.trg_sync_bundles_for_product();

-- ── 4. when an option's stock moves ────────────────────────────────────
-- A bundle pins one exact option per item, so only that option matters.
-- The bundle's own price-carrying option is in no bundle_items row, so
-- writing it finds nothing and does nothing.
create or replace function public.trg_sync_bundles_for_variant()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_bundle uuid;
begin
  for v_bundle in
    select distinct bi.bundle_product_id
    from public.bundle_items bi
    where bi.item_variant_id = new.id
  loop
    perform public.sync_bundle_stock(v_bundle);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_variants_sync_bundle_stock on public.product_variants;
create trigger trg_variants_sync_bundle_stock
after update of stock on public.product_variants
for each row
execute function public.trg_sync_bundles_for_variant();

-- ── 5. when the contents change ────────────────────────────────────────
-- Adding an item, removing one, or changing a quantity all change the
-- answer. The admin form replaces a bundle's contents wholesale (delete
-- every row, then insert the new set), so this fires several times during
-- one save and simply lands on the right number at the end.
create or replace function public.trg_sync_bundle_on_items_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_bundle_stock(old.bundle_product_id);
    return old;
  end if;

  perform public.sync_bundle_stock(new.bundle_product_id);

  -- A row moved from one bundle to another: both answers changed.
  if tg_op = 'UPDATE' and old.bundle_product_id is distinct from new.bundle_product_id then
    perform public.sync_bundle_stock(old.bundle_product_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bundle_items_sync_stock on public.bundle_items;
create trigger trg_bundle_items_sync_stock
after insert or update or delete on public.bundle_items
for each row
execute function public.trg_sync_bundle_on_items_change();

-- ── 6. correct every bundle that already exists ────────────────────────
-- Idempotent: sync_bundle_stock writes nothing when the value is already
-- right, so running this file again is a no-op.
do $$
declare
  v_id uuid;
  v_before integer;
  v_after integer;
  v_changed integer := 0;
  v_total integer := 0;
begin
  for v_id, v_before in
    select id, stock from public.products where product_kind = 'bundle' and is_deleted = false
  loop
    v_total := v_total + 1;
    perform public.sync_bundle_stock(v_id);
    select stock into v_after from public.products where id = v_id;
    if v_before is distinct from v_after then
      v_changed := v_changed + 1;
      raise notice 'bundle % : stock % -> %', v_id, v_before, v_after;
    end if;
  end loop;
  raise notice 'backfill done: % bundle(s) checked, % corrected', v_total, v_changed;
end $$;

-- Rollback for THIS file alone (sql/086 also removes it as part of
-- undoing the whole feature):
--   drop trigger if exists trg_bundle_items_sync_stock on public.bundle_items;
--   drop trigger if exists trg_variants_sync_bundle_stock on public.product_variants;
--   drop trigger if exists trg_products_sync_bundle_stock on public.products;
--   drop function if exists public.trg_sync_bundle_on_items_change();
--   drop function if exists public.trg_sync_bundles_for_variant();
--   drop function if exists public.trg_sync_bundles_for_product();
--   drop function if exists public.sync_bundle_stock(uuid);
--   drop function if exists public.bundle_available_units(uuid);
