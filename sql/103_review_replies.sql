-- Shop replies on customer reviews.
--
-- Three nullable columns plus a recreated storefront view. Additive: every
-- existing review has no reply, and a review with no reply renders exactly
-- as it does today.
--
-- WHY THE VIEW HAS TO BE RECREATED. The product page does not read the
-- reviews table -- it reads product_customer_reviews (sql/081), which
-- lists its columns explicitly rather than using select *. Adding columns
-- to the table alone would leave the reply invisible to the storefront,
-- with nothing obviously wrong to explain why.
--
-- reply_text and replied_at ARE exposed. replied_by is NOT: it is a staff
-- user id, it has no business leaving the admin, and the view is granted
-- to anon.
--
-- SAFE TO REVIEW: three ADD COLUMN IF NOT EXISTS on an 8-row table, one
-- CREATE OR REPLACE VIEW that only adds columns to an existing select, and
-- one UPDATE matching a single review by primary key.

begin;

-- ── 1. the columns ─────────────────────────────────────────────────────

alter table public.reviews
  add column if not exists reply_text text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by uuid;

-- ON DELETE SET NULL, deliberately. A plain reference defaults to NO
-- ACTION, which is exactly the bug sql/083 exists to fix on
-- store_settings.updated_by: once a staff member has replied to anything,
-- Postgres refuses to delete their account, and the auth API reports it as
-- an opaque 500 that retries forever with nothing pointing at the cause.
-- Deleting a staff account should orphan the attribution, not become
-- impossible.
--
-- Wrapped in a DO block so re-running this file cannot fail on a
-- constraint that already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_replied_by_fkey'
  ) then
    alter table public.reviews
      add constraint reviews_replied_by_fkey
      foreign key (replied_by) references auth.users(id) on delete set null;
  end if;
end $$;

-- The 500-character limit, enforced at the layer that cannot be bypassed.
-- The textarea and the server action both check it too; this is the one
-- that still holds if a bug skips them both.
--
-- NOT VALID is not used: there are no existing replies, so there is
-- nothing to validate against.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_reply_text_length'
  ) then
    alter table public.reviews
      add constraint reviews_reply_text_length
      check (reply_text is null or char_length(reply_text) <= 500);
  end if;
end $$;

comment on column public.reviews.reply_text is
  'Shop reply shown under the review on the product page. Plain text only -- URLs are stripped on save and React escapes it on render, so it cannot carry markup or links. Max 500 characters.';
comment on column public.reviews.replied_by is
  'Admin who last posted or edited the reply. Never exposed to the storefront; deliberately absent from product_customer_reviews.';

-- ── 2. the storefront view, with the two public reply columns ──────────
-- Identical to sql/081 apart from the two added columns. The status and
-- staff-author filters are unchanged: still only approved reviews, still
-- excluding anything written from an admin account.
create or replace view public.product_customer_reviews as
  select
    r.id,
    r.product_id,
    r.user_id,
    r.rating,
    r.title,
    r.comment,
    r.verified_purchase,
    r.status,
    r.created_at,
    r.reply_text,
    r.replied_at
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.status = 'approved'
    and coalesce(p.is_admin, false) = false;

grant select on public.product_customer_reviews to anon, authenticated;

-- ── 3. re-hide the review that came back ───────────────────────────────
-- sql/099 set this one to 'pending' rather than deleting or editing it:
-- its comment is manufacturer marketing copy ("**AirPods Pro (2nd Gen)**
-- deliver rich, detailed sound with powerful Active Noise Cancellation
-- and a natural Transparency mode"), not anything a customer wrote.
--
-- It is approved again and live on the TWS Pro product page. 'pending'
-- put it back in the admin moderation queue with nothing on screen saying
-- why, so approving it was the natural thing to do. 'rejected' is the
-- honest state: a decision already taken, not a question still open.
--
-- Nothing about the row's text is altered -- only its status.
update public.reviews
set status = 'rejected'
where id = 'f3d915e6-f1d4-41f6-83cf-308843c19980';

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- 1. The three columns, replied_by nullable:
--
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'reviews'
--   and column_name in ('reply_text','replied_at','replied_by');
--
-- 2. The view exposes reply_text and replied_at but NOT replied_by:
--
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'product_customer_reviews'
-- order by ordinal_position;
--
-- 3. The limit bites (this should RAISE AN ERROR, which is the point):
--
-- update public.reviews set reply_text = repeat('x', 501)
-- where id = (select id from public.reviews limit 1);
--
-- 4. The AirPods review is hidden, its text untouched:
--
-- select status, title, left(comment, 60) from public.reviews
-- where id = 'f3d915e6-f1d4-41f6-83cf-308843c19980';
