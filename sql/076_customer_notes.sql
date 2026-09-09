-- Admin-only free-text note per customer, for the Customers detail panel.
--
-- One row per customer, not an append-only log: v1 is deliberately a single
-- editable field with no history and no versioning, so customer_id is the
-- primary key rather than a separate id with a foreign key. Upserting on
-- that key is then the whole write path -- there is no "which note row is
-- the current one" question to get wrong later.
--
-- There is no storefront read path for this table anywhere in the app, and
-- the RLS below is what guarantees that stays true even if one is added by
-- accident: every policy requires public.is_admin(), so a customer querying
-- their own notes gets zero rows rather than their own file. That is the
-- point -- these are notes ABOUT a customer, written for staff, and they
-- must never round-trip back to the person they describe.
create table public.customer_notes (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  note text not null default '',
  -- Who last touched it. Kept as a plain reference (not an audit trail) so
  -- a second admin can see whose note they are editing.
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_notes enable row level security;

-- Admin-only in every direction. Note the WITH CHECK on insert/update as
-- well as the USING clauses: USING alone governs which rows are visible to
-- the statement, not what a non-admin may write.
create policy "customer_notes_select_admin" on public.customer_notes
  for select using (public.is_admin());

create policy "customer_notes_insert_admin" on public.customer_notes
  for insert with check (public.is_admin());

create policy "customer_notes_update_admin" on public.customer_notes
  for update using (public.is_admin()) with check (public.is_admin());

create policy "customer_notes_delete_admin" on public.customer_notes
  for delete using (public.is_admin());

create trigger trg_customer_notes_updated_at
  before update on public.customer_notes
  for each row execute function public.set_updated_at();
