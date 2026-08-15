-- Finance Phase 2: Expenses.
--
-- Genuinely new, fully isolated bookkeeping -- no foreign key to orders,
-- order_items, or any other revenue table anywhere in this file. An expense
-- can never modify or be joined against an order; it's purely additive
-- record-keeping the admin panel reads back for its own Expenses list.
-- Reuses public.is_admin() and public.set_updated_at(), both defined in
-- 001_schema.sql -- no new helper functions needed.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in (
    'product_purchase', 'shipping', 'packaging', 'advertising',
    'marketing', 'payment_fees', 'software', 'other'
  )),
  amount numeric(10,2) not null check (amount >= 0),
  expense_date date not null,
  payment_method text not null check (payment_method in (
    'cash', 'bank_transfer', 'card', 'online', 'other'
  )),
  note text,

  -- Who recorded it -- set null (not cascaded away) if that admin account
  -- is later removed, so the expense record itself always survives.
  created_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

create index expenses_expense_date_idx on public.expenses(expense_date);
create index expenses_category_idx on public.expenses(category);

alter table public.expenses enable row level security;

-- Admin-only in both directions -- unlike campaigns/products, there is no
-- storefront-facing reason for this table to ever be readable by a
-- non-admin, so there's no public select policy at all.
create policy "expenses_admin_all" on public.expenses
  for all using (public.is_admin()) with check (public.is_admin());
