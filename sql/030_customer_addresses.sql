-- Checkout Redesign (v12), Phase 1 — customer address book + profile
-- preferences. Independent of orders.shipping_addresses (which stays a
-- per-order snapshot, untouched here) — see sql/020's header comment and
-- the Phase 1 plan for why these are deliberately separate tables.

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  address_label text,
  first_name text not null,
  last_name text not null,
  phone text not null,
  street text not null,
  city text not null,
  district text not null check (district in (
    'Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle',
    'Matara','Hambantota','Jaffna','Kilinochchi','Mannar','Vavuniya',
    'Mullaitivu','Batticaloa','Ampara','Trincomalee','Kurunegala',
    'Puttalam','Anuradhapura','Polonnaruwa','Badulla','Monaragala',
    'Ratnapura','Kegalle')),
  postal_code text,
  is_default boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_addresses_customer_id_idx
  on public.customer_addresses(customer_id) where not is_deleted;

-- Enforces "exactly one default per customer" at the DB level, not in
-- app code — a partial unique index makes a two-step
-- unset-old/set-new update genuinely safe under concurrency (see
-- set_default_address below, which does both in one statement so this
-- constraint is never transiently violated).
create unique index customer_addresses_one_default_per_customer
  on public.customer_addresses(customer_id) where is_default and not is_deleted;

alter table public.customer_addresses enable row level security;

create policy "customer_addresses_select_own" on public.customer_addresses
  for select using (auth.uid() = customer_id);

create policy "customer_addresses_insert_own" on public.customer_addresses
  for insert with check (auth.uid() = customer_id);

create policy "customer_addresses_update_own" on public.customer_addresses
  for update using (auth.uid() = customer_id);

-- No delete policy — deletion is soft (is_deleted = true via update),
-- matching products.is_deleted's convention. Nothing in the app issues
-- a real DELETE against this table.

create trigger trg_customer_addresses_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

-- Atomically makes p_address_id the caller's only default address.
-- Needed because a naive "unset old default, then set new default" from
-- the client would be two separate statements — under concurrency (or
-- even just a mid-request failure) that could transiently leave zero or
-- two defaults, violating the partial unique index above. Doing both in
-- one statement, in one transaction, inside a single function call
-- avoids that entirely.
-- Two sequential UPDATEs, not one — deliberately. A single UPDATE that
-- toggles is_default across multiple rows in one statement is NOT safe
-- here: Postgres's partial unique index enforces its constraint as each
-- row is written *during* that statement's execution, in an order that
-- isn't guaranteed, so the new-default row could be written before the
-- old-default row is cleared, transiently violating the index (and
-- partial unique indexes can't be made DEFERRABLE in Postgres, unlike a
-- full-table UNIQUE constraint). Unsetting everything first, then
-- setting the target, guarantees at most zero defaults exist between the
-- two statements — never two.
create or replace function public.set_default_address(p_address_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid := auth.uid();
begin
  if v_customer_id is null then
    raise exception 'You must be logged in.';
  end if;

  update public.customer_addresses
    set is_default = false
    where customer_id = v_customer_id and is_default and not is_deleted;

  update public.customer_addresses
    set is_default = true
    where id = p_address_id and customer_id = v_customer_id and not is_deleted;

  if not found then
    raise exception 'Address not found.';
  end if;
end;
$$;

grant execute on function public.set_default_address to authenticated;

-- ── profiles: notification + payment preference ────────────────────────
alter table public.profiles
  add column email_notifications boolean not null default true,
  add column preferred_payment_method text
    check (preferred_payment_method in ('cod','bank_transfer','payhere'));
