-- Finance Phase 3: Commission Settings (future marketplace groundwork) +
-- Seller Settlement schema prep.
--
-- Deliberate future-proofing, not active functionality. Nothing in this
-- migration is read by checkout, create_order_atomic, or any pricing path --
-- confirmed by grep across the whole app codebase after this shipped. The
-- commission system defaults OFF and stays OFF until a future project
-- phase actually wires it into pricing.

-- ── Commission Settings (store_settings rows, same table every prior
--    Settings phase used -- no schema change there) ─────────────────────
insert into public.store_settings (key, value, type, group_name, description) values
  ('commission.enabled', 'false', 'boolean', 'commission', 'Marketplace commission system. Stays OFF and has zero effect on current orders/checkout/pricing until a future phase wires it in.'),
  ('commission.type', '"category_based"', 'string', 'commission', 'How commission is calculated. Only "category_based" exists today.'),
  ('commission.default_percent', '0', 'number', 'commission', 'Fallback commission percentage for a category with no specific rule.');

-- ── Per-category commission rules ───────────────────────────────────────
create table public.commission_category_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  commission_percent numeric(5,2) not null check (commission_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint commission_category_rules_category_unique unique (category_id)
);

create trigger trg_commission_category_rules_updated_at before update on public.commission_category_rules
  for each row execute function public.set_updated_at();

alter table public.commission_category_rules enable row level security;

create policy "commission_category_rules_admin_all" on public.commission_category_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Seller Settlement -- schema/architecture only ───────────────────────
-- No application code reads or writes this table yet (no query layer, no
-- Server Actions, no admin page) -- purely laying down the shape a future
-- multi-vendor settlement feature will need. Deliberately no seller_id/
-- sellers table: this codebase has no multi-vendor concept yet, and
-- inventing one here would be scope beyond "prepare the schema." That
-- column belongs to whichever future phase actually introduces sellers.
create table public.seller_settlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,

  release_amount numeric(10,2) not null default 0,
  commission numeric(10,2) not null default 0,
  payment_fee numeric(10,2) not null default 0,
  shipping_fee numeric(10,2) not null default 0,
  release_status text not null default 'pending' check (release_status in ('pending', 'held', 'released')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_seller_settlements_updated_at before update on public.seller_settlements
  for each row execute function public.set_updated_at();

create index seller_settlements_order_id_idx on public.seller_settlements(order_id);

alter table public.seller_settlements enable row level security;

create policy "seller_settlements_admin_all" on public.seller_settlements
  for all using (public.is_admin()) with check (public.is_admin());
