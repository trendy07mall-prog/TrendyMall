-- The one-line customer quote under each Customer Favourites card.
--
-- Same reason as sql/079's rating view: picking the review needs
-- profiles (to exclude staff authors, and to get a first name), and
-- profiles is RLS'd to "your own row, or everything if you are an admin",
-- so an anonymous visitor can read none of it. A view owned by postgres
-- can, and exposes only what the card actually prints.
--
-- PRIVACY: this deliberately selects ONLY the reviewer's first name --
-- split_part on the first space -- never the full name, the e-mail, the
-- phone number or the user id. There is no column here that could
-- identify the reviewer beyond a first name, so nothing downstream has to
-- remember to drop one.
--
-- Selection rules, all applied here so the app cannot drift from them:
--   * approved
--   * author is not an admin (coalesce to false: no profile row means
--     unknown, which counts as a customer, same as sql/079)
--   * has actual written text, not a rating-only review
--   * rated 4 or better -- a lukewarm quote under a "Top Rated" badge
--     would undercut the badge
--   * the most recent one that matches, one per product
create or replace view public.product_customer_review_snippets as
  select distinct on (r.product_id)
    r.product_id,
    r.comment,
    r.rating,
    r.created_at,
    nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), '') as reviewer_first_name
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.status = 'approved'
    and coalesce(p.is_admin, false) = false
    and r.comment is not null
    and length(trim(r.comment)) > 0
    and r.rating >= 4
  order by r.product_id, r.created_at desc;

grant select on public.product_customer_review_snippets to anon, authenticated;
