-- One-time fix: the Lenovo product's slug was generated (via the admin form)
-- before slugify() gained a 60-char cap, from the full free-text product
-- name. Regenerates it the same way lib/utils.ts's slugify() does, records
-- the old slug in product_slug_redirects (sql/010) so existing links/shares
-- 301 redirect instead of 404ing, and only touches rows whose slug actually
-- changes (safe to re-run).

do $$
declare
  v_product record;
  v_new_slug text;
  v_candidate text;
  v_suffix int;
begin
  for v_product in
    select id, slug, name from public.products where name ilike '%lenovo%'
  loop
    v_new_slug := trim(both '-' from regexp_replace(lower(trim(v_product.name)), '[^a-z0-9]+', '-', 'g'));
    v_new_slug := trim(both '-' from substring(v_new_slug from 1 for 60));

    v_candidate := v_new_slug;
    v_suffix := 1;
    while exists (
      select 1 from public.products
      where slug = v_candidate and id <> v_product.id
    ) loop
      v_suffix := v_suffix + 1;
      v_candidate := v_new_slug || '-' || v_suffix;
    end loop;
    v_new_slug := v_candidate;

    if v_new_slug <> v_product.slug then
      insert into public.product_slug_redirects (old_slug, product_id)
      values (v_product.slug, v_product.id)
      on conflict (old_slug) do nothing;

      update public.products
      set slug = v_new_slug, updated_at = now()
      where id = v_product.id;
    end if;
  end loop;
end $$;
