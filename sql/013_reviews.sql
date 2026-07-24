-- Customer reviews: one review per user per product, moderated before it's
-- publicly visible. product_rating_summary is a read-only aggregate view
-- (approved reviews only, baked into the view definition itself so it can
-- never leak pending/rejected rows regardless of RLS nuance) that product
-- listing queries join against for the star + count shown on cards.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  comment text,
  verified_purchase boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index reviews_product_id_idx on public.reviews(product_id);

alter table public.reviews enable row level security;

create policy "reviews_select_approved_own_or_admin" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());

create policy "reviews_insert_own" on public.reviews
  for insert with check (user_id = auth.uid());

create policy "reviews_update_admin" on public.reviews
  for update using (public.is_admin());

create policy "reviews_delete_admin" on public.reviews
  for delete using (public.is_admin());

create view public.product_rating_summary as
  select
    product_id,
    round(avg(rating)::numeric, 1) as avg_rating,
    count(*) as review_count
  from public.reviews
  where status = 'approved'
  group by product_id;
