-- Phase 4 of the cart redesign: a per-user persisted cart for logged-in
-- customers. Guests keep using localStorage (client-side only, no table).
--
-- One row per (user, product) — the unique constraint is what makes the
-- login-merge routine (lib/cart-sync.ts) a plain upsert instead of manual
-- diffing. No admin-read policy: an in-progress cart isn't a business
-- record the way a placed order is, so there's no operational reason for
-- admins to read another user's cart_items.

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index cart_items_user_id_idx on public.cart_items(user_id);

alter table public.cart_items enable row level security;

create policy "cart_items_select_own" on public.cart_items
  for select using (auth.uid() = user_id);

create policy "cart_items_insert_own" on public.cart_items
  for insert with check (auth.uid() = user_id);

create policy "cart_items_update_own" on public.cart_items
  for update using (auth.uid() = user_id);

create policy "cart_items_delete_own" on public.cart_items
  for delete using (auth.uid() = user_id);

create trigger trg_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();
