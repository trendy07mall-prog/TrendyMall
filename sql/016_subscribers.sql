-- Newsletter subscribers. Public can insert (no login required); only
-- admins can read the list (for the /admin/subscribers export).

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

create policy "subscribers_insert_anyone" on public.subscribers
  for insert with check (true);

create policy "subscribers_select_admin" on public.subscribers
  for select using (public.is_admin());

create policy "subscribers_delete_admin" on public.subscribers
  for delete using (public.is_admin());
