-- SELF-TEST for sql/085_bundles.sql. Proves the order path actually
-- behaves, against the real functions, on the real database.
--
-- SAFE TO RUN ON A LIVE DATABASE. Everything happens inside one
-- transaction that ends in ROLLBACK, so nothing it creates survives: no
-- test products, no test order, no stock change. If any assertion fails
-- the whole thing aborts, which also rolls back. The only thing that does
-- not roll back is the order-number sequence, which advances by two --
-- harmless, and the same thing a cancelled real checkout does.
--
-- Run it in the Supabase SQL editor AFTER sql/085, in one go, and read
-- the NOTICEs. Every line must say ok.
--
-- What it proves, in order:
--   1. a NORMAL product order is completely unchanged
--   2. a bundle writes one priced line plus its contents at zero
--   3. a bundle's stock comes out of the ITEMS, not the bundle
--   4. the bundle's own stock column is never touched
--   5. cancelling a bundle puts every item's stock back
--   6. a bundle cannot be sold when one item inside has run out
--   7. the contents do not count as sales of their own

begin;

do $$
declare
  v_category uuid;
  v_admin uuid;
  v_item_a uuid; v_item_b uuid; v_bundle uuid; v_plain uuid;
  v_var_a uuid; v_var_b uuid; v_var_bundle uuid; v_var_plain uuid;
  v_order_id uuid; v_order_number text;
  v_n integer; v_stock integer; v_money numeric; v_ok boolean; v_msg text;
begin
  -- ── setup ────────────────────────────────────────────────────────────
  select id into v_category from public.categories limit 1;
  if v_category is null then raise exception 'No category exists to hang test products off.'; end if;

  -- cancel_order_atomic refuses anyone who is not an admin, so the test
  -- borrows a real admin's identity for this transaction only. set_config
  -- with is_local = true means it is discarded at rollback.
  select id into v_admin from public.profiles where is_admin limit 1;
  if v_admin is null then raise exception 'No admin profile exists; cannot test the cancel path.'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  if not public.is_admin() then raise exception 'Could not assume the admin identity for this test.'; end if;

  -- Two things to put in a bundle, and one ordinary product to prove the
  -- normal path is untouched. Stock numbers are deliberately different so
  -- a wrong one cannot accidentally look right.
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-selftest-item-a', 'Selftest Item A', '', v_category, 'published', 10, 'single')
  returning id into v_item_a;
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-selftest-item-b', 'Selftest Item B', '', v_category, 'published', 7, 'single')
  returning id into v_item_b;
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-selftest-plain', 'Selftest Plain', '', v_category, 'published', 5, 'single')
  returning id into v_plain;

  insert into public.product_variants (product_id, regular_price, sale_price, stock, is_default, is_active)
  values (v_item_a, 1200, null, 10, true, true) returning id into v_var_a;
  insert into public.product_variants (product_id, regular_price, sale_price, stock, is_default, is_active)
  values (v_item_b, 450, null, 7, true, true) returning id into v_var_b;
  insert into public.product_variants (product_id, regular_price, sale_price, stock, is_default, is_active)
  values (v_plain, 300, null, 5, true, true) returning id into v_var_plain;

  -- The bundle: a product with product_kind = 'bundle', one option
  -- carrying the price, and rows saying what is inside. Its own stock is
  -- set to 999 ON PURPOSE -- if anything ever reads it, the assertions
  -- below will notice, because nothing should change it or depend on it.
  insert into public.products (slug, name, description, category_id, status, stock, product_kind)
  values ('zz-selftest-bundle', 'Selftest Bundle', '', v_category, 'published', 999, 'bundle')
  returning id into v_bundle;
  insert into public.product_variants (product_id, regular_price, sale_price, stock, is_default, is_active)
  values (v_bundle, 1500, null, null, true, true) returning id into v_var_bundle;

  insert into public.bundle_items (bundle_product_id, item_product_id, item_variant_id, quantity, sort_order)
  values (v_bundle, v_item_a, v_var_a, 1, 0),
         (v_bundle, v_item_b, v_var_b, 2, 1);   -- two of item B per bundle

  -- ── 1. a normal product order is unchanged ───────────────────────────
  select o.order_id, o.order_number into v_order_id, v_order_number
  from public.create_order_atomic(
    'Selftest', 'selftest@example.com', '0770000000',
    'Self', 'Test', '1 Test Lane', 'Colombo', 'Colombo', '10600',
    'standard', 'cod', null,
    jsonb_build_array(jsonb_build_object('product_id', v_plain, 'variant_id', v_var_plain, 'quantity', 2)),
    null
  ) o;

  select count(*) into v_n from public.order_items where order_id = v_order_id;
  if v_n <> 1 then raise exception 'FAIL 1a: a normal order wrote % lines, expected 1', v_n; end if;

  select count(*) into v_n from public.order_items where order_id = v_order_id and bundle_id is not null;
  if v_n <> 0 then raise exception 'FAIL 1b: a normal order wrote % bundle-contents lines, expected 0', v_n; end if;

  select stock into v_stock from public.products where id = v_plain;
  if v_stock <> 3 then raise exception 'FAIL 1c: normal product stock is %, expected 3 (5 - 2)', v_stock; end if;
  select stock into v_stock from public.product_variants where id = v_var_plain;
  if v_stock <> 3 then raise exception 'FAIL 1d: normal variant stock is %, expected 3', v_stock; end if;

  raise notice 'ok 1  normal product order unchanged: one line, no bundle marker, stock 5 -> 3';

  -- ── 2-4. a bundle order ──────────────────────────────────────────────
  select o.order_id, o.order_number into v_order_id, v_order_number
  from public.create_order_atomic(
    'Selftest', 'selftest@example.com', '0770000000',
    'Self', 'Test', '1 Test Lane', 'Colombo', 'Colombo', '10600',
    'standard', 'cod', null,
    jsonb_build_array(jsonb_build_object('product_id', v_bundle, 'variant_id', v_var_bundle, 'quantity', 2)),
    null
  ) o;

  select count(*) into v_n from public.order_items where order_id = v_order_id;
  if v_n <> 3 then raise exception 'FAIL 2a: a bundle order wrote % lines, expected 3 (1 priced + 2 contents)', v_n; end if;

  select count(*) into v_n
  from public.order_items where order_id = v_order_id and bundle_id = v_bundle;
  if v_n <> 2 then raise exception 'FAIL 2b: % lines marked as contents, expected 2', v_n; end if;

  -- The money is all on the bundle's own line and none of it on the
  -- contents. This is the assertion that protects the customer from ever
  -- being shown "Rs 0" against a real product.
  select count(*) into v_n
  from public.order_items
  where order_id = v_order_id and bundle_id is not null and (unit_price <> 0 or subtotal <> 0);
  if v_n <> 0 then raise exception 'FAIL 2c: % contents lines carry money, expected 0', v_n; end if;

  select subtotal into v_money from public.order_items
  where order_id = v_order_id and bundle_id is null;
  if v_money <> 3000 then raise exception 'FAIL 2d: the bundle line is %, expected 3000 (1500 x 2)', v_money; end if;

  raise notice 'ok 2  bundle order: 1 priced line at 3000 + 2 contents lines at 0';

  -- Stock came out of the items, multiplied by both quantities.
  select stock into v_stock from public.products where id = v_item_a;
  if v_stock <> 8 then raise exception 'FAIL 3a: item A stock is %, expected 8 (10 - 1x2)', v_stock; end if;
  select stock into v_stock from public.products where id = v_item_b;
  if v_stock <> 3 then raise exception 'FAIL 3b: item B stock is %, expected 3 (7 - 2x2)', v_stock; end if;
  select stock into v_stock from public.product_variants where id = v_var_a;
  if v_stock <> 8 then raise exception 'FAIL 3c: item A variant stock is %, expected 8', v_stock; end if;
  select stock into v_stock from public.product_variants where id = v_var_b;
  if v_stock <> 3 then raise exception 'FAIL 3d: item B variant stock is %, expected 3', v_stock; end if;

  raise notice 'ok 3  stock left the items, not the bundle: A 10 -> 8, B 7 -> 3 (2 per bundle x 2)';

  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 999 then raise exception 'FAIL 4: the bundle''s own stock changed to %, expected it untouched at 999', v_stock; end if;

  raise notice 'ok 4  the bundle''s own stock column was never touched';

  -- ── 7. the contents are not sales of their own ───────────────────────
  select coalesce(sum(units_sold), 0) into v_n
  from public.product_sales_summary where product_id in (v_item_a, v_item_b);
  if v_n <> 0 then raise exception 'FAIL 7: the items inside counted % units sold, expected 0', v_n; end if;

  select coalesce(sum(units_sold), 0) into v_n
  from public.product_sales_summary where product_id = v_bundle;
  if v_n <> 2 then raise exception 'FAIL 7b: the bundle counted % units sold, expected 2', v_n; end if;

  raise notice 'ok 7  sales figures: the bundle counts 2 units, the items inside count 0';

  -- ── 5. cancelling puts every item's stock back ───────────────────────
  if not public.cancel_order_atomic(v_order_id, 'cancelled', null, 'self-test') then
    raise exception 'FAIL 5a: cancel_order_atomic returned false';
  end if;

  select stock into v_stock from public.products where id = v_item_a;
  if v_stock <> 10 then raise exception 'FAIL 5b: after cancel item A stock is %, expected 10', v_stock; end if;
  select stock into v_stock from public.products where id = v_item_b;
  if v_stock <> 7 then raise exception 'FAIL 5c: after cancel item B stock is %, expected 7', v_stock; end if;
  select stock into v_stock from public.product_variants where id = v_var_a;
  if v_stock <> 10 then raise exception 'FAIL 5d: after cancel item A variant stock is %, expected 10', v_stock; end if;
  select stock into v_stock from public.product_variants where id = v_var_b;
  if v_stock <> 7 then raise exception 'FAIL 5e: after cancel item B variant stock is %, expected 7', v_stock; end if;
  select stock into v_stock from public.products where id = v_bundle;
  if v_stock <> 999 then raise exception 'FAIL 5f: cancel changed the bundle''s own stock to %', v_stock; end if;

  raise notice 'ok 5  cancel restored every item: A back to 10, B back to 7, bundle still untouched';

  -- ── 6. one empty item blocks the whole bundle ────────────────────────
  update public.products set stock = 0 where id = v_item_b;
  update public.product_variants set stock = 0 where id = v_var_b;

  v_ok := false;
  begin
    perform public.create_order_atomic(
      'Selftest', 'selftest@example.com', '0770000000',
      'Self', 'Test', '1 Test Lane', 'Colombo', 'Colombo', '10600',
      'standard', 'cod', null,
      jsonb_build_array(jsonb_build_object('product_id', v_bundle, 'variant_id', v_var_bundle, 'quantity', 1)),
      null
    );
  exception when others then
    v_ok := true;
    v_msg := SQLERRM;
  end;
  if not v_ok then
    raise exception 'FAIL 6a: a bundle sold even though an item inside was out of stock';
  end if;
  if position('Selftest Item B' in v_msg) = 0 then
    raise exception 'FAIL 6b: the refusal did not name the item that ran out. It said: %', v_msg;
  end if;

  raise notice 'ok 6  out of stock: refused, and the message names the item -- "%"', v_msg;

  raise notice '----------------------------------------------------------';
  raise notice 'ALL CHECKS PASSED. Rolling back -- nothing above was kept.';
end $$;

rollback;
