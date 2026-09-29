-- SELF-TEST for sql/091 -- a bundle is unavailable if anything inside it
-- is.
--
-- SAFE TO RUN ON A LIVE DATABASE. One transaction, ending in ROLLBACK.
-- Postgres never shows uncommitted rows to anyone else, so the test
-- products cannot appear in the shop even for an instant, and when it
-- rolls back none of it ever existed. The order-number sequence advances
-- by one, exactly as an abandoned checkout does.
--
-- The cases:
--   A  an item is UNPUBLISHED           -> bundle 0, and it comes back
--   B  an item is SOFT-DELETED          -> bundle 0, and it comes back
--   C  an item's chosen OPTION is switched off -> bundle 0, and back
--   D  the bundle itself is still published throughout - its own status
--      says nothing about the state of the things inside it
--   E  ordering it is REFUSED, and the refusal names the item
--   F  the refusal leaves NO stock taken from the healthy items
--   G  a healthy bundle still sells normally afterwards
--   H  a normal product is completely unaffected by any of this

begin;

do $$
declare
  v_category uuid;
  v_a uuid; v_b uuid; v_bundle uuid; v_plain uuid;
  v_va uuid; v_vb uuid; v_vbundle uuid; v_vplain uuid;
  v_stock integer; v_a_stock integer;
  v_ok boolean; v_msg text;
  v_order_id uuid;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then raise exception 'No category exists to hang test products off.'; end if;

  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-avail-a', 'Avail Item A', '', v_category, 'published', 20, 'single') returning id into v_a;
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-avail-b', 'Avail Item B', '', v_category, 'published', 20, 'single') returning id into v_b;
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-avail-plain', 'Avail Plain', '', v_category, 'published', 6, 'single') returning id into v_plain;

  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_a, 1000, 20, true, true) returning id into v_va;
  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_b, 500, 20, true, true) returning id into v_vb;
  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_plain, 250, 6, true, true) returning id into v_vplain;

  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-avail-bundle', 'Avail Bundle', '', v_category, 'published', 0, 'bundle') returning id into v_bundle;
  insert into public.product_variants (product_id, regular_price, stock, is_default, is_active)
  values (v_bundle, 1200, null, true, true) returning id into v_vbundle;

  insert into public.bundle_items (bundle_product_id, item_product_id, item_variant_id, quantity, sort_order)
  values (v_bundle, v_a, v_va, 1, 0), (v_bundle, v_b, v_vb, 1, 1);

  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 20 then raise exception 'FAIL setup: a healthy bundle reports %, expected 20', v_stock; end if;
  raise notice 'ok    setup: a healthy bundle of two 20-stock items reports 20';

  -- ── A. an item is unpublished ────────────────────────────────────────
  update public.products set status = 'draft' where id = v_b;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 0 then raise exception 'FAIL A: with item B unpublished the bundle reports %, expected 0', v_stock; end if;
  raise notice 'ok A  an item was UNPUBLISHED: the bundle went to 0 (it still has 20 in stock)';

  -- ── D. the bundle is still published, which is the whole point ───────
  select status into v_msg from public.products where id = v_bundle;
  if v_msg <> 'published' then raise exception 'FAIL D: the bundle''s own status changed to %', v_msg; end if;
  raise notice 'ok D  the bundle itself is still "published" -- its status never said anything about its contents';

  -- ── E + F. ordering it is refused, and nothing is taken ──────────────
  select stock into v_a_stock from public.product_variants where id = v_va;
  v_ok := false;
  begin
    perform public.create_order_atomic(
      'Avail Test', 'availtest@example.com', '0770000000',
      'Avail', 'Test', '1 Test Lane', 'Colombo', 'Colombo', '10600',
      'standard', 'cod', null,
      jsonb_build_array(jsonb_build_object('product_id', v_bundle, 'variant_id', v_vbundle, 'quantity', 1)),
      null
    );
  exception when others then
    v_ok := true; v_msg := SQLERRM;
  end;
  if not v_ok then raise exception 'FAIL E: the bundle sold even though an item inside was unpublished'; end if;
  if position('Avail Item B' in v_msg) = 0 then
    raise exception 'FAIL E2: the refusal did not name the item. It said: %', v_msg;
  end if;
  raise notice 'ok E  ordering it was REFUSED, naming the item -- "%"', v_msg;

  select stock into v_stock from public.product_variants where id = v_va;
  if v_stock <> v_a_stock then
    raise exception 'FAIL F: the refused order still took stock from the healthy item (% -> %)', v_a_stock, v_stock;
  end if;
  raise notice 'ok F  the refused order took nothing from the healthy item: still %', v_stock;

  -- republish and confirm it comes straight back
  update public.products set status = 'published' where id = v_b;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 20 then raise exception 'FAIL A2: after republishing, the bundle reports %, expected 20', v_stock; end if;
  raise notice 'ok A2 republished: the bundle came straight back to 20';

  -- ── B. an item is soft-deleted ───────────────────────────────────────
  update public.products set is_deleted = true where id = v_b;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 0 then raise exception 'FAIL B: with item B deleted the bundle reports %, expected 0', v_stock; end if;
  raise notice 'ok B  an item was DELETED: the bundle went to 0';

  update public.products set is_deleted = false where id = v_b;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 20 then raise exception 'FAIL B2: after restoring, the bundle reports %, expected 20', v_stock; end if;
  raise notice 'ok B2 restored: the bundle came back to 20';

  -- ── C. the chosen option is switched off ─────────────────────────────
  update public.product_variants set is_active = false where id = v_vb;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 0 then raise exception 'FAIL C: with the option switched off the bundle reports %, expected 0', v_stock; end if;
  raise notice 'ok C  the exact OPTION was switched off: the bundle went to 0';

  update public.product_variants set is_active = true where id = v_vb;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 20 then raise exception 'FAIL C2: after switching it back on the bundle reports %, expected 20', v_stock; end if;
  raise notice 'ok C2 option switched back on: the bundle came back to 20';

  -- ── G. a healthy bundle still sells ──────────────────────────────────
  select o.order_id into v_order_id
  from public.create_order_atomic(
    'Avail Test', 'availtest@example.com', '0770000000',
    'Avail', 'Test', '1 Test Lane', 'Colombo', 'Colombo', '10600',
    'standard', 'cod', null,
    jsonb_build_array(jsonb_build_object('product_id', v_bundle, 'variant_id', v_vbundle, 'quantity', 2)),
    null
  ) o;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 18 then raise exception 'FAIL G: after selling 2 the bundle reports %, expected 18', v_stock; end if;
  select stock into v_stock from public.product_variants where id = v_va;
  if v_stock <> 18 then raise exception 'FAIL G2: item A''s option stock is %, expected 18', v_stock; end if;
  raise notice 'ok G  once everything inside is healthy again it sells normally: 20 -> 18';

  -- ── H. a normal product never felt any of this ───────────────────────
  select stock into v_stock from public.products where id = v_plain;
  if v_stock <> 6 then raise exception 'FAIL H: the unrelated normal product is at %, expected 6', v_stock; end if;
  raise notice 'ok H  an unrelated normal product was never touched: still 6';

  raise notice '----------------------------------------------------------';
  raise notice 'ALL CHECKS PASSED. Rolling back -- nothing above was kept.';
end $$;

rollback;
