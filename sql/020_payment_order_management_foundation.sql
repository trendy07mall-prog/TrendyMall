-- Payment & Order Management System (v10), Phase 1 — database foundation.
-- Additive only: nothing existing is renamed, retyped, or dropped, so the
-- currently-deployed checkout keeps working unmodified even if this runs
-- before the matching Phase 2 code ships. orders.status is kept (still
-- written by today's live code) alongside the new order_status/
-- payment_status columns that Phase 2's rewritten checkout will use —
-- status becomes legacy once Phase 2 ships and is dropped in a later
-- cleanup migration, not this one.

-- ── orders: new columns ─────────────────────────────────────────────────

alter table public.orders alter column user_id drop not null;

alter table public.orders
  add column payment_status text not null default 'pending'
    check (payment_status in ('pending','awaiting_verification','paid','failed','cancelled','refunded')),
  add column order_status text not null default 'pending'
    check (order_status in ('pending','confirmed','packing','shipped','out_for_delivery','delivered','cancelled','returned')),
  add column subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  add column discount numeric(10,2) not null default 0 check (discount >= 0),
  add column delivery_method text not null default 'standard' check (delivery_method in ('standard')),
  add column courier text,
  add column tracking_number text,
  add column tracking_url text,
  add column notes text,
  add column deleted_at timestamptz;

-- payment_method already exists (default 'unpaid', no constraint) —
-- constrain it now that real gateway values are on the horizon. 'unpaid'
-- is kept as a valid legacy value for existing rows.
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('unpaid','cod','bank_transfer','payhere'));

-- Backfill the two new status columns from the existing single-column
-- status, and subtotal from total - shipping_fee (discount defaults to 0
-- for every pre-existing order, since coupons don't exist yet).
update public.orders set
  payment_status = case when status = 'cancelled' then 'cancelled' else 'pending' end,
  order_status = status,
  subtotal = greatest(0, total - shipping_fee);

-- Defense in depth: total can never drift from its components, enforced
-- at the DB layer on top of Phase 2's server-side recalculation.
alter table public.orders
  add constraint orders_total_matches_components
  check (total = subtotal + shipping_fee - discount);

-- Cosmetic format update only (e.g. TM-2026-00042) — the underlying
-- sequence (order_number_seq, from sql/015) is unchanged and already
-- concurrency-safe; existing order_number values on old rows are untouched.
alter table public.orders
  alter column order_number set default (
    'TM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0')
  );

-- ── order_items: variant snapshot ───────────────────────────────────────
-- product_name/unit_price/product_image_url already snapshot at checkout
-- time (001, 019) — only the variant selection was missing.

alter table public.order_items
  add column variant_name text,
  add column variant_color_hex text;

-- ── payments ─────────────────────────────────────────────────────────────

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  gateway text not null check (gateway in ('cod','bank_transfer','payhere')),
  transaction_id text,
  reference_number text,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'LKR',
  status text not null default 'pending'
    check (status in ('pending','awaiting_verification','paid','failed','cancelled','refunded')),
  raw_gateway_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotency for Phase 6's webhook: a repeat callback with the same
-- gateway transaction id fails a plain insert / becomes a safe no-op via
-- ON CONFLICT DO NOTHING. Partial (WHERE transaction_id is not null) so
-- COD/bank-transfer rows without a gateway transaction id are unaffected.
create unique index payments_transaction_id_unique_idx
  on public.payments(transaction_id) where transaction_id is not null;
create index payments_order_id_idx on public.payments(order_id);

create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ── shipping_addresses ───────────────────────────────────────────────────
-- One structured row per order (not a reusable address book — nothing in
-- the spec asks for saved addresses). orders.shipping_address (free text)
-- is kept and stays populated by Phase 2 as a formatted summary string, so
-- every current display of it keeps working unmodified.

create table public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text not null,
  street text not null,
  city text not null,
  district text not null check (district in (
    'Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle',
    'Matara','Hambantota','Jaffna','Kilinochchi','Mannar','Vavuniya',
    'Mullaitivu','Batticaloa','Ampara','Trincomalee','Kurunegala',
    'Puttalam','Anuradhapura','Polonnaruwa','Badulla','Monaragala',
    'Ratnapura','Kegalle')),
  postal_code text,
  created_at timestamptz not null default now()
);
create unique index shipping_addresses_order_id_unique_idx
  on public.shipping_addresses(order_id);

-- ── coupons ──────────────────────────────────────────────────────────────

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage','fixed','free_shipping')),
  value numeric(10,2) not null default 0 check (value >= 0),
  min_order_value numeric(10,2) not null default 0 check (min_order_value >= 0),
  usage_limit integer,
  usage_limit_per_customer integer,
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_percentage_max check (type <> 'percentage' or value <= 100)
);
create trigger trg_coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- usage_count is the atomic counter Phase 7's redeem_coupon() RPC will
-- increment with a guarded UPDATE ... WHERE usage_limit IS NULL OR
-- usage_count < usage_limit — same guarded-UPDATE pattern as reduce_stock
-- below. The redemption function itself is Phase 7 scope; this phase only
-- ships the tables.
create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  discount_amount numeric(10,2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);
create unique index coupon_redemptions_order_id_unique_idx
  on public.coupon_redemptions(order_id);
create index coupon_redemptions_coupon_id_idx on public.coupon_redemptions(coupon_id);

-- ── order_status_history ─────────────────────────────────────────────────
-- A trigger, not application-code logging: guarantees every status change
-- is captured regardless of which future code path (admin UI, webhook, a
-- bug) makes it, rather than relying on every call site remembering to log.

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  field text not null check (field in ('order_status','payment_status')),
  old_value text,
  new_value text not null,
  note text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_id_idx on public.order_status_history(order_id);

create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_status is distinct from old.order_status then
    insert into public.order_status_history (order_id, changed_by, field, old_value, new_value)
    values (new.id, auth.uid(), 'order_status', old.order_status, new.order_status);
  end if;
  if new.payment_status is distinct from old.payment_status then
    insert into public.order_status_history (order_id, changed_by, field, old_value, new_value)
    values (new.id, auth.uid(), 'payment_status', old.payment_status, new.payment_status);
  end if;
  return new;
end;
$$;

create trigger trg_order_status_history after update on public.orders
  for each row execute function public.log_order_status_change();

-- ── atomic stock primitives (Rule #2) ───────────────────────────────────
-- reduce_stock returns false (not an exception) when stock is insufficient,
-- so Phase 2's order-creation RPC can check each item and roll back the
-- whole transaction cleanly if any one fails. The guarded UPDATE ... WHERE
-- stock >= p_quantity is what makes concurrent checkouts on the last unit
-- safe: a second concurrent transaction's WHERE clause simply matches zero
-- rows once the first has committed.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_stock_non_negative') then
    alter table public.products add constraint products_stock_non_negative check (stock >= 0);
  end if;
end $$;

create or replace function public.reduce_stock(p_product_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.products
  set stock = stock - p_quantity
  where id = p_product_id and stock >= p_quantity and is_deleted = false
  returning 1 into v_updated;

  return v_updated is not null;
end;
$$;

create or replace function public.restore_stock(p_product_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products set stock = stock + p_quantity where id = p_product_id;
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.payments enable row level security;
create policy "payments_select_own_or_admin" on public.payments
  for select using (
    exists (select 1 from public.orders o where o.id = payments.order_id and (o.user_id = auth.uid() or public.is_admin()))
  );
create policy "payments_admin_write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.shipping_addresses enable row level security;
create policy "shipping_addresses_select_own_or_admin" on public.shipping_addresses
  for select using (
    exists (select 1 from public.orders o where o.id = shipping_addresses.order_id and (o.user_id = auth.uid() or public.is_admin()))
  );
create policy "shipping_addresses_insert_own" on public.shipping_addresses
  for insert with check (
    exists (select 1 from public.orders o where o.id = shipping_addresses.order_id and o.user_id = auth.uid())
  );
create policy "shipping_addresses_admin_write" on public.shipping_addresses
  for update using (public.is_admin());

alter table public.coupons enable row level security;
create policy "coupons_select_valid_or_admin" on public.coupons
  for select using (
    public.is_admin() or (is_active and (starts_at is null or starts_at <= now()) and (expires_at is null or expires_at > now()))
  );
create policy "coupons_admin_write" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.coupon_redemptions enable row level security;
create policy "coupon_redemptions_select_own_or_admin" on public.coupon_redemptions
  for select using (user_id = auth.uid() or public.is_admin());
-- No client insert/update/delete policy: only Phase 7's security-definer
-- redeem_coupon() RPC writes here, the same bypass-via-security-definer
-- pattern already used by track_order()/on_auth_user_created() elsewhere
-- in this codebase.

alter table public.order_status_history enable row level security;
create policy "order_status_history_select_own_or_admin" on public.order_status_history
  for select using (
    exists (select 1 from public.orders o where o.id = order_status_history.order_id and (o.user_id = auth.uid() or public.is_admin()))
  );
-- No client write policy — only the security-definer trigger writes here.

-- Additive, non-breaking companion to orders_customer_cancel_own_pending
-- (sql/002) — RLS policies for the same command are OR'd together, so
-- nothing existing changes; this just gives Phase 2+ code (which will
-- write order_status, not status) the same self-cancel capability.
create policy "orders_customer_cancel_own_pending_v2" on public.orders
  for update using (auth.uid() = user_id and order_status = 'pending')
  with check (order_status = 'cancelled');
