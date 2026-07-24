-- Adds a short human-friendly order number and a guest-safe lookup function
-- so a customer can check their order status with just the number + phone,
-- without needing to log in (orders' RLS is otherwise owner-only via
-- auth.uid(), which a guest tracking page can't satisfy).

create sequence public.order_number_seq start 1;

-- A volatile default (nextval) forces Postgres to evaluate it per existing
-- row when the column is added, so this single statement both adds the
-- column and backfills a unique number for every order already in the table.
alter table public.orders
  add column order_number text unique not null default (
    'TM-' || lpad(nextval('public.order_number_seq')::text, 6, '0')
  );

create index orders_order_number_idx on public.orders(order_number);

-- Security definer: runs with the function owner's privileges, bypassing the
-- caller's RLS, but only ever returns the single row matching BOTH the exact
-- order number and phone — never a broader listing — so it can't be used to
-- enumerate other customers' orders.
create or replace function public.track_order(p_order_number text, p_phone text)
returns table (
  order_number text,
  status text,
  total numeric,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.order_number, o.status, o.total, o.created_at
  from public.orders o
  where o.order_number = p_order_number
    and o.customer_phone = p_phone;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
