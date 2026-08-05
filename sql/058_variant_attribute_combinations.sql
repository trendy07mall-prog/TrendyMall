-- Real multi-attribute variant matching. A product_variant stays exactly
-- what it is today (one priced/stocked/SKU'd/imaged row, keyed by color) --
-- it can now additionally carry tags like {Mah: "5000mah to 10000mah"} via
-- this join table, letting the PDP match a variant on the FULL selected
-- combination instead of color alone. attribute_value_id deliberately has
-- NO "on delete cascade" -- same lesson as product_tags.tag_id (Stage 3)
-- and product_attribute_values.attribute_value_id (Stage 5): deleting a
-- value still linked to a variant is blocked, not silently cascaded away.

create table public.product_variant_attribute_values (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  attribute_value_id uuid not null references public.attribute_values(id),
  created_at timestamptz not null default now(),
  primary key (variant_id, attribute_value_id)
);
create index product_variant_attribute_values_value_id_idx
  on public.product_variant_attribute_values(attribute_value_id);

alter table public.product_variant_attribute_values enable row level security;

create policy "product_variant_attribute_values_select_published_or_admin"
  on public.product_variant_attribute_values
  for select using (
    exists (
      select 1 from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = product_variant_attribute_values.variant_id
        and (p.status = 'published' or public.is_admin())
    )
  );

create policy "product_variant_attribute_values_insert_admin"
  on public.product_variant_attribute_values
  for insert with check (public.is_admin());

create policy "product_variant_attribute_values_update_admin"
  on public.product_variant_attribute_values
  for update using (public.is_admin());

create policy "product_variant_attribute_values_delete_admin"
  on public.product_variant_attribute_values
  for delete using (public.is_admin());

-- Best-effort backfill, reviewable not blind: the only two products
-- affected today have their capacity jammed into the free-text color_name
-- as a manual workaround (e.g. "white 1000mah to 5000mah"), because this
-- is exactly the gap being fixed. Link a variant to an attribute value
-- already assigned to its product only when that value's text appears as
-- a case-insensitive substring of the variant's color_name -- ambiguous or
-- absent matches are simply left unlinked for manual admin review, never
-- guessed.
insert into public.product_variant_attribute_values (variant_id, attribute_value_id)
select v.id, av.id
from public.product_variants v
join public.product_attribute_values pav on pav.product_id = v.product_id
join public.attribute_values av on av.id = pav.attribute_value_id
join public.attributes a on a.id = av.attribute_id
where a.slug <> 'color'
  and position(lower(av.value) in lower(v.color_name)) > 0
on conflict do nothing;
