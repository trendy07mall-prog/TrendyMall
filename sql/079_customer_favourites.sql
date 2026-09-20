-- Homepage "Customer Favourites" carousel: Top Rated, falling back to
-- Best Sellers. Both need data a storefront visitor cannot read directly,
-- so both go through an object owned by postgres, the same way
-- product_rating_summary (sql/013) and product_sales_summary (sql/018)
-- already do.

-- ---------------------------------------------------------------------
-- 1. Customer-only rating summary.
--
-- product_rating_summary (sql/013) averages EVERY approved review,
-- including ones written from an admin/owner account. This section must
-- rank on genuine customer sentiment, so it needs the same aggregate with
-- staff reviews excluded.
--
-- Written as a view rather than an app-side join on purpose: profiles is
-- RLS'd to "your own row, or everything if you are an admin"
-- (sql/002_rls_policies.sql), so an anonymous visitor can read NO profile
-- rows at all and could never work out who is staff. A view runs as its
-- owner, which is what lets it see profiles while exposing only the
-- aggregate -- no reviewer identity, admin or otherwise, leaves this view.
--
-- Role source is profiles.is_admin, which is the ONLY role flag this
-- schema has: there is no separate staff or owner column, and this is
-- deliberately not matched on names or e-mail patterns. If a staff/owner
-- role is added later, widen the predicate here and nothing else changes.
--
-- coalesce(..., false): a review whose author has no profiles row counts
-- as a customer. Failing open toward "customer" is right -- the profile
-- row is created by a trigger for real signups, so a missing one means
-- unknown, not staff, and silently dropping real reviews would be the
-- worse error.
create or replace view public.product_customer_rating_summary as
  select
    r.product_id,
    round(avg(r.rating)::numeric, 1) as avg_rating,
    count(*) as review_count
  from public.reviews r
  left join public.profiles p on p.id = r.user_id
  where r.status = 'approved'
    and coalesce(p.is_admin, false) = false
  group by r.product_id;

grant select on public.product_customer_rating_summary to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Recent best sellers.
--
-- A function, not a view, because the window has to stay configurable from
-- the app (lib/customer-favourites.ts owns the 90 days) and a view cannot
-- take a parameter. security definer for the same reason as the view
-- above: orders and order_items are RLS'd to "your own orders, or
-- everything if you are an admin", so an anonymous visitor can read none
-- of them. Only the per-product totals come back -- no order, customer or
-- money data crosses this boundary.
--
-- Counts only genuinely completed sales: order_status = 'delivered'.
-- 'cancelled' and 'returned' are excluded by that same equality (they are
-- separate values of the same column), so a returned order cannot inflate
-- a product's rank. Deleted/unpublished products are filtered here too, so
-- the caller never has to re-check.
create or replace function public.get_recent_top_sellers(
  p_days integer,
  p_limit integer
)
returns table (product_id uuid, units_sold bigint)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id, sum(oi.quantity)::bigint as units_sold
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products pr on pr.id = oi.product_id
  where oi.product_id is not null
    and o.order_status = 'delivered'
    and o.created_at >= now() - make_interval(days => p_days)
    and pr.status = 'published'
    and pr.is_deleted = false
    and pr.stock > 0
  group by oi.product_id
  having sum(oi.quantity) > 0
  order by units_sold desc
  limit p_limit;
$$;

revoke all on function public.get_recent_top_sellers(integer, integer) from public;
grant execute on function public.get_recent_top_sellers(integer, integer) to anon, authenticated;

-- Supports the window scan above; orders is already indexed on its own id.
create index if not exists orders_delivered_created_at_idx
  on public.orders(created_at)
  where order_status = 'delivered';
