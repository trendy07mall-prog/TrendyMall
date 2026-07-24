-- A simple editable announcement banner shown at the top of every page.
-- Multiple rows can exist (history of past banners); the storefront only
-- ever shows the most recently updated row with is_active = true.

create table public.site_banner (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  link_url text,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.site_banner enable row level security;

create policy "site_banner_select_active_or_admin" on public.site_banner
  for select using (is_active or public.is_admin());

create policy "site_banner_insert_admin" on public.site_banner
  for insert with check (public.is_admin());

create policy "site_banner_update_admin" on public.site_banner
  for update using (public.is_admin());

create policy "site_banner_delete_admin" on public.site_banner
  for delete using (public.is_admin());
