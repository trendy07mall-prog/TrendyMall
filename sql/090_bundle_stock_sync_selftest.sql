-- SELF-TEST for sql/089 -- the database keeping a bundle's stock correct
-- by itself.
--
-- SAFE TO RUN ON A LIVE DATABASE. Everything happens inside one
-- transaction that ends in ROLLBACK. Postgres never shows uncommitted
-- rows to anyone else, so the test products cannot appear in the shop
-- even for an instant, and when it rolls back none of it ever existed.
-- The only thing that does not roll back is the order-number sequence,
-- which advances by one, exactly as an abandoned checkout does.
--
-- Every case the brief asked for gets its own check:
--   A  an item's stock is edited by an admin
--   B  an item is restocked
--   C  an order takes stock (reduce_stock, through checkout)
--   D  an order is cancelled (restore_stock, through the real function)
--   E  an item is ADDED to the bundle
--   F  an item's quantity is CHANGED
--   G  an item is REMOVED from the bundle
--   H  every item removed - an empty bundle can sell nothing
--   I  the option's own stock is the limit, not the product's
--   J  an option that tracks no stock falls back to the product's number
--   K  the floor rule: 5 in stock, 2 per bundle, is 2 bundles not 2.5
--   L  a negative stock counts as none, never as a negative bundle count
--   M  THE SAFETY NET: something writes a wrong number directly and the
--      recalculation wins
--   N  a normal product's stock is never touched by any of this

begin;

do $$
declare
  v_category uuid;
  v_admin uuid;
  v_a uuid; v_b uuid; v_c uuid; v_plain uuid; v_bundle uuid;
  v_va uuid; v_vb uuid; v_vc uuid; v_vplain uuid; v_vbundle uuid;
  v_item_c_row uuid;
  v_order_id uuid;
  v_stock integer;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then raise exception 'No category exists to hang test products off.'; end if;
  select id into v_admin from public.profiles where is_admin limit 1;
  if v_admin is null then raise exception 'No admin profile exists; cannot test the cancel path.'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);

  -- ── setup ────────────────────────────────────────────────────────────
  -- A: option stock 10 (product 50, so the OPTION is the limit)
  -- B: option stock 7
  -- C: no option stock at all (product 9 is the only number)
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-sync-a', 'Sync Item A', '', v_category, 'published', 50, 'single') returning id into v_a;
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-sync-b', 'Sync Item B', '', v_category, 'published', 7, 'single') returning id into v_b;
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-sync-c', 'Sync Item C', '', v_category, 'published', 9, 'single') returning id into v_c;
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-sync-plain', 'Sync Plain', '', v_category, 'published', 4, 'single') returning id into v_plain;

  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_a, 1000, 10, true, true) returning id into v_va;
  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_b, 500, 7, true, true) returning id into v_vb;
  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_c, 300, null, true, true) returning id into v_vc;   -- tracks no stock
  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_plain, 200, 4, true, true) returning id into v_vplain;

  -- The bundle starts with a deliberately WRONG stock of 999, to prove
  -- the first contents insert corrects it rather than leaving it alone.
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-sync-bundle', 'Sync Bundle', '', v_category, 'published', 999, 'bundle') returning id into v_bundle;
  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_bundle, 1200, null, true, true) returning id into v_vbundle;

  -- 1 x A per bundle. A has 10 available (option 10 beats product 50).
  insert into public.bundle_items (bundle_product_id, item_product_id, item_variant_id, quantity, sort_order)
  values (v_bundle, v_a, v_va, 1, 0);

  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 10 then raise exception 'FAIL setup: bundle stock is %, expected 10 (and 999 to be corrected)', v_stock; end if;
  raise notice 'ok I  the option''s stock is the limit, not the product''s: 999 -> 10 (option 10, product 50)';

  -- ── E. adding an item ────────────────────────────────────────────────
  insert into public.bundle_items (bundle_product_id, item_product_id, item_variant_id, quantity, sort_order)
  values (v_bundle, v_b, v_vb, 1, 1);
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 7 then raise exception 'FAIL E: after adding item B stock is %, expected 7', v_stock; end if;
  raise notice 'ok E  item added to the bundle: 10 -> 7 (B is now the lowest)';

  -- ── J. an option that tracks no stock ────────────────────────────────
  insert into public.bundle_items (bundle_product_id, item_product_id, item_variant_id, quantity, sort_order)
  values (v_bundle, v_c, v_vc, 1, 2) returning id into v_item_c_row;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 7 then raise exception 'FAIL J: stock is %, expected 7 (C has 9 via its product, B still lowest)', v_stock; end if;
  update public.products set stock = 3 where id = v_c;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 3 then raise exception 'FAIL J2: stock is %, expected 3 (C''s product number is its limit)', v_stock; end if;
  update public.products set stock = 9 where id = v_c;
  raise notice 'ok J  an option with no stock of its own follows its product: 7 -> 3 -> 7';

  -- ── A. an admin edits an item's stock ────────────────────────────────
  update public.product_variants set stock = 2 where id = v_vb;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 2 then raise exception 'FAIL A: after editing B''s option stock the bundle is %, expected 2', v_stock; end if;
  raise notice 'ok A  admin edits an item''s option stock: bundle 7 -> 2';

  update public.products set stock = 1 where id = v_b;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 1 then raise exception 'FAIL A2: after editing B''s product stock the bundle is %, expected 1', v_stock; end if;
  raise notice 'ok A2 admin edits an item''s product stock: bundle 2 -> 1';

  -- ── B. restock ───────────────────────────────────────────────────────
  update public.products set stock = 7 where id = v_b;
  update public.product_variants set stock = 7 where id = v_vb;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 7 then raise exception 'FAIL B: after restocking B the bundle is %, expected 7', v_stock; end if;
  raise notice 'ok B  item restocked: bundle 1 -> 7';

  -- ── K. the floor rule ────────────────────────────────────────────────
  update public.bundle_items set quantity = 2 where bundle_product_id = v_bundle and item_variant_id = v_vb;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 3 then raise exception 'FAIL K: 7 in stock at 2 per bundle gave %, expected 3', v_stock; end if;
  raise notice 'ok F/K quantity changed to 2 per bundle: 7 in stock -> 3 whole bundles (not 3.5)';

  update public.bundle_items set quantity = 1 where bundle_product_id = v_bundle and item_variant_id = v_vb;

  -- ── L. negative stock ────────────────────────────────────────────────
  update public.products set stock = -5 where id = v_b;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 0 then raise exception 'FAIL L: a negative item stock gave %, expected 0', v_stock; end if;
  raise notice 'ok L  a negative item stock counts as none: bundle 0, never negative';
  update public.products set stock = 7 where id = v_b;

  -- ── G. removing an item ──────────────────────────────────────────────
  delete from public.bundle_items where id = v_item_c_row;      -- C had 9
  update public.products set stock = 100 where id = v_b;
  update public.product_variants set stock = 100 where id = v_vb;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 10 then raise exception 'FAIL G: after removing C and restocking B the bundle is %, expected 10 (A''s option)', v_stock; end if;
  raise notice 'ok G  item removed from the bundle: recalculated to 10 (A is the only limit left)';

  -- ── M. THE SAFETY NET ────────────────────────────────────────────────
  -- Something writes a wrong number straight onto the bundle. The
  -- recalculation must win, whatever wrote it.
  update public.products set stock = 4242 where id = v_bundle;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 10 then raise exception 'FAIL M: a direct write of 4242 survived as %, expected it corrected to 10', v_stock; end if;
  raise notice 'ok M  SAFETY NET: a direct write of 4242 was corrected straight back to 10';

  -- ── C. an order takes stock ──────────────────────────────────────────
  select o.order_id into v_order_id
  from public.create_order_atomic(
    'Sync Test', 'synctest@example.com', '0770000000',
    'Sync', 'Test', '1 Test Lane', 'Colombo', 'Colombo', '10600',
    'standard', 'cod', null,
    jsonb_build_array(jsonb_build_object('product_id', v_bundle, 'variant_id', v_vbundle, 'quantity', 3)),
    null
  ) o;

  select stock into v_stock from public.product_variants where id = v_va;
  if v_stock <> 7 then raise exception 'FAIL C1: item A''s option stock is %, expected 7 (10 - 3)', v_stock; end if;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 7 then raise exception 'FAIL C2: after ordering 3 bundles the bundle stock is %, expected 7', v_stock; end if;
  raise notice 'ok C  an order took stock: item A 10 -> 7, and the bundle followed 10 -> 7 by itself';

  -- ── N. a normal product is untouched by any of this ──────────────────
  select stock into v_stock from public.products where id = v_plain;
  if v_stock <> 4 then raise exception 'FAIL N: the unrelated normal product moved to %, expected 4', v_stock; end if;

  -- ── D. cancelling puts it back, and the recalculation wins ───────────
  if not public.cancel_order_atomic(v_order_id, 'cancelled', null, 'sync self-test') then
    raise exception 'FAIL D0: cancel_order_atomic returned false';
  end if;

  select stock into v_stock from public.product_variants where id = v_va;
  if v_stock <> 10 then raise exception 'FAIL D1: after cancel item A''s option stock is %, expected 10', v_stock; end if;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 10 then raise exception 'FAIL D2: after cancel the bundle stock is %, expected 10 -- the recalculation did NOT win', v_stock; end if;
  raise notice 'ok D  order cancelled: item A back to 10, bundle recalculated back to 10 (not 13)';

  -- ── H. an empty bundle can sell nothing ──────────────────────────────
  delete from public.bundle_items where bundle_product_id = v_bundle;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 0 then raise exception 'FAIL H: an empty bundle reports %, expected 0', v_stock; end if;
  raise notice 'ok H  every item removed: the bundle can sell 0';

  -- ── N again, at the very end ─────────────────────────────────────────
  select stock into v_stock from public.products where id = v_plain;
  if v_stock <> 4 then raise exception 'FAIL N2: the unrelated normal product ended at %, expected 4', v_stock; end if;
  raise notice 'ok N  a normal product''s stock was never touched by any of this';

  raise notice '----------------------------------------------------------';
  raise notice 'ALL CHECKS PASSED. Rolling back -- nothing above was kept.';
end $$;

rollback;
