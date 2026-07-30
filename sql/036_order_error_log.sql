-- Makes an unexpected order-creation failure actually visible without
-- needing Vercel log access or DevTools — the customer sees a short
-- reference code, and this table holds the real Postgres error behind
-- it for an admin to look up on /admin/debug.
--
-- Insert is open to anon/authenticated (a failed request is reported by
-- the same unauthenticated/authenticated caller that hit it — this table
-- has no other purpose, so a write-only-to-self, admin-read-only shape
-- is the right one). No update/delete policy — entries are immutable.
create table public.order_error_log (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  error_code text,
  error_message text,
  error_detail text,
  error_hint text,
  context jsonb,
  created_at timestamptz not null default now()
);

create index order_error_log_created_at_idx on public.order_error_log(created_at desc);

alter table public.order_error_log enable row level security;

create policy "order_error_log_insert_any" on public.order_error_log
  for insert with check (true);

create policy "order_error_log_select_admin" on public.order_error_log
  for select using (public.is_admin());
