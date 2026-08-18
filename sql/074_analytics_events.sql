-- Analytics Phase 1: first-party conversion event logging + per-session
-- marketing-source attribution, feeding /admin/analytics' Conversion Funnel,
-- Conversion Rate KPI, and Marketing Sources sections.
--
-- Deliberately separate from (and never dependent on) the Meta Pixel --
-- every write goes through the service-role client only (see
-- lib/analytics/log-event.ts for events, proxy.ts for session_sources), so
-- there is no public insert policy on either table at all. Only
-- public.is_admin() (sql/001_schema.sql) can read either one -- same
-- admin-only-in-both-directions posture as sql/071_expenses.sql, except
-- writes here come from trusted server code rather than the admin UI.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase'
  )),
  page_path text not null,
  -- Set null (not cascaded away) if the product is later deleted, so
  -- historical funnel counts never silently disappear.
  product_id uuid references public.products(id) on delete set null,
  -- Anonymous, cookie-based (proxy.ts mints it, no PII) -- stays the same
  -- across login/logout, distinct from Supabase's own sb-* auth cookies.
  session_id text not null,
  value numeric(10,2),
  created_at timestamptz not null default now()
);

create index events_event_type_idx on public.events(event_type);
create index events_session_id_idx on public.events(session_id);
create index events_created_at_idx on public.events(created_at);
-- Funnel/KPI queries always filter by event_type within a date range --
-- one composite index covers both instead of forcing a full index scan on
-- created_at alone.
create index events_type_created_at_idx on public.events(event_type, created_at);

alter table public.events enable row level security;

create policy "events_admin_select" on public.events
  for select using (public.is_admin());

-- One row per anonymous session, written once by proxy.ts the first time a
-- session_id cookie is minted -- the row's mere existence is what proxy.ts
-- checks to decide "already attributed," so a session's original source is
-- never overwritten by a later visit in the same session.
create table public.session_sources (
  session_id text primary key,
  source text not null,
  created_at timestamptz not null default now()
);

create index session_sources_created_at_idx on public.session_sources(created_at);

alter table public.session_sources enable row level security;

create policy "session_sources_admin_select" on public.session_sources
  for select using (public.is_admin());
