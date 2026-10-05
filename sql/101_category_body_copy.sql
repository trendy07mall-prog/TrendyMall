-- A separate column for the long, visible category page copy.
--
-- WHY A NEW COLUMN. categories.description already does two jobs: it is
-- the page's <meta name="description"> AND the intro line under the <h1>.
-- Both want roughly one sentence. The 150-250 words of body copy wanted
-- for SEO is a third job that is incompatible with the first -- a 200-word
-- meta description is truncated by Google into nonsense. So the long copy
-- gets its own field and the short one keeps doing what it already does
-- well.
--
-- WHERE IT RENDERS. Below the product grid, above the footer -- not under
-- the heading. Putting 200 words between the <h1> and the products would
-- push the grid down the page, and shoppers came for products, not an
-- essay. Google reads the whole document, so the position costs nothing
-- in ranking terms. This is also what large retailers do with category
-- text.
--
-- NULLABLE AND EMPTY BY DEFAULT. Every one of the 23 categories starts
-- with no body copy and renders exactly as it does today -- the block is
-- hidden entirely when the column is null or blank. Nothing changes until
-- somebody writes copy into a category.
--
-- text, not varchar(n): there is no length Postgres should be enforcing
-- here, and the two are stored identically. Any real limit is an
-- editorial one.
--
-- SAFE TO REVIEW: one additive statement on a 23-row table. Adding a
-- nullable column takes no table rewrite and no lock of consequence.
-- Nothing existing is read, changed or dropped.

alter table public.categories
  add column if not exists body_copy text;

comment on column public.categories.body_copy is
  'Long-form visible copy rendered BELOW the product grid on the category page. Separate from description, which is the meta description and the short intro line under the h1. Null or blank hides the block entirely.';

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- Expect one row: body_copy | text | YES (nullable).
--
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'categories'
--   and column_name = 'body_copy';
--
-- And that every category starts empty:
--
-- select count(*) as total,
--        count(body_copy) as with_copy
-- from public.categories;
