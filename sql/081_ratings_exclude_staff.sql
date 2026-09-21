-- Site-wide: a product's rating means its CUSTOMERS' rating.
--
-- product_rating_summary (sql/013) averaged every approved review,
-- including ones written from the store's own admin account, and it is the
-- number shown on the product page, on every product card, in the rating
-- filter and in cart recommendations. So the store could rate itself, and
-- did: two of the five approved reviews are admin-authored.
--
-- sql/079 already added product_customer_rating_summary for the homepage's
-- Customer Favourites shelf. Rather than leave two views computing almost
-- the same thing -- exactly the kind of pair that drifts apart -- the base
-- view now carries the rule and the other becomes a pass-through alias, so
-- there is one definition and the existing callers of each keep working
-- unchanged.

-- Same aggregate as before, minus admin-authored reviews. coalesce to
-- false: a review whose author has no profiles row counts as a customer
-- (failing toward "customer" is right -- a missing profile means unknown,
-- not staff, and silently dropping real reviews is the worse error).
create or replace view public.product_rating_summary as
  select
    r.product_id,
    round(avg(r.rating)::numeric, 1) as avg_rating,
    count(*) as review_count
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.status = 'approved'
    and coalesce(p.is_admin, false) = false
  group by r.product_id;

-- Now redundant, kept as an alias so sql/079's callers need no change and
-- the two can never disagree.
create or replace view public.product_customer_rating_summary as
  select product_id, avg_rating, review_count from public.product_rating_summary;

-- The review LIST on the product page, with the same exclusion.
--
-- Needed as a view for the same reason as the summaries: deciding who is
-- staff requires profiles, which no storefront visitor can read under RLS,
-- so the app cannot filter these itself. Without this the product page
-- would show "5.0 (3)" above five review cards, two of them written by the
-- store -- a worse inconsistency than the one being fixed.
--
-- Column-for-column what public.reviews exposes to the storefront today,
-- so getProductReviews can read this instead with no shape change. No
-- reviewer identity is added here; the caller's own profiles lookup (which
-- returns nothing for an anonymous visitor, hence the existing "Verified
-- Customer" fallback) is left exactly as it was.
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
    r.created_at
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.status = 'approved'
    and coalesce(p.is_admin, false) = false;

grant select on public.product_rating_summary to anon, authenticated;
grant select on public.product_customer_rating_summary to anon, authenticated;
grant select on public.product_customer_reviews to anon, authenticated;
