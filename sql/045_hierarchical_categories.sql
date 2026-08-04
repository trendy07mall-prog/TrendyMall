-- Stage 1 of the catalog architecture roadmap: hierarchical categories.
-- Additive only -- no existing column dropped/renamed, every existing
-- category/product association untouched. All 5 current categories become
-- root-level nodes (depth 0), exactly matching their current flat behavior.

alter table public.categories
  add column parent_id uuid references public.categories(id),
  add column depth integer not null default 0,
  add column path text not null default '',
  add column is_active boolean not null default true;

create index categories_parent_id_idx on public.categories(parent_id);
-- text_pattern_ops supports an indexed `path like 'prefix.%'` descendant
-- query (used to find "products in this category and every descendant")
-- without a recursive CTE.
create index categories_path_idx on public.categories(path text_pattern_ops);

-- Existing rows are all root-level today -- path is just their own id.
update public.categories set path = id::text, depth = 0 where parent_id is null;

-- path/depth are trigger-maintained, not app-computed: path depends on a
-- PARENT row's own path, and reparenting a category must cascade to every
-- descendant's path too -- exactly the kind of cross-row invariant that's
-- unsafe to leave to application code (same reasoning as products.search_vector
-- being a generated column rather than something the app keeps in sync).
create or replace function public.set_category_path() returns trigger
language plpgsql as $$
declare
  v_parent record;
begin
  if new.parent_id is null then
    new.depth := 0;
    new.path := new.id::text;
  else
    select depth, path into v_parent from public.categories where id = new.parent_id;
    if not found then
      raise exception 'Parent category % does not exist', new.parent_id;
    end if;
    new.depth := v_parent.depth + 1;
    new.path := v_parent.path || '.' || new.id::text;
  end if;
  return new;
end;
$$;

create trigger categories_set_path
  before insert or update of parent_id on public.categories
  for each row execute function public.set_category_path();

-- The BEFORE trigger above only fixes the row actually being moved -- this
-- cascades the new path prefix onto every existing descendant whenever a
-- category is reparented (a no-op on insert, since a brand-new category has
-- no descendants yet).
create or replace function public.cascade_category_path() returns trigger
language plpgsql as $$
begin
  if old.path is distinct from new.path then
    update public.categories
    set path = new.path || substring(path from length(old.path) + 1),
        depth = depth + (new.depth - old.depth)
    where path like old.path || '.%';
  end if;
  return new;
end;
$$;

create trigger categories_cascade_path
  after update of parent_id on public.categories
  for each row execute function public.cascade_category_path();

-- Same shape and RLS as product_slug_redirects (sql/010) -- fires only when
-- an admin renames a category's slug, so old links keep resolving instead of
-- 404ing. is_active filtering (like products.status) happens in query code,
-- not RLS, matching how categories_select_all already works.
create table public.category_slug_redirects (
  old_slug text primary key,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index category_slug_redirects_category_id_idx
  on public.category_slug_redirects(category_id);

alter table public.category_slug_redirects enable row level security;

create policy "category_slug_redirects_select_all" on public.category_slug_redirects
  for select using (true);

create policy "category_slug_redirects_insert_admin" on public.category_slug_redirects
  for insert with check (public.is_admin());

create policy "category_slug_redirects_update_admin" on public.category_slug_redirects
  for update using (public.is_admin());

create policy "category_slug_redirects_delete_admin" on public.category_slug_redirects
  for delete using (public.is_admin());
