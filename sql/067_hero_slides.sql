-- Hero Slide Manager (Phase 2 of the admin Settings project).
-- Replaces the hardcoded DESKTOP_SLIDES/MOBILE_SLIDES arrays in
-- components/marketing/HeroSlider.tsx with an admin-managed list. Status/
-- RLS shape matches public.campaigns (sql/062_campaigns.sql) exactly;
-- public.is_admin() and public.set_updated_at() are both defined in
-- 001_schema.sql. Unlike campaigns, hero slides have no downstream
-- referential/history dependency anywhere in the schema, so a real hard
-- delete is offered here (campaigns deliberately don't allow one).
create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  button_text text,
  button_link text,
  desktop_image_url text not null,
  mobile_image_url text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  sort_order integer not null default 0,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hero_slides_end_after_start_check check (end_at is null or start_at is null or end_at > start_at)
);

create index hero_slides_status_idx on public.hero_slides(status);

create trigger trg_hero_slides_updated_at before update on public.hero_slides
  for each row execute function public.set_updated_at();

alter table public.hero_slides enable row level security;

create policy "hero_slides_select_published_or_admin" on public.hero_slides
  for select using (status = 'published' or public.is_admin());

create policy "hero_slides_admin_write" on public.hero_slides
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed the 3 current live slides verbatim (same image paths, same click
-- behavior) so this migration is visually a no-op. subtitle/button_text
-- are left null -- the new opt-in overlay only renders when one of those
-- is set, so these slides keep looking exactly like they do today.
insert into public.hero_slides
  (title, subtitle, button_text, button_link, desktop_image_url, mobile_image_url, status, sort_order) values
  (
    'TrendyMall — Sri Lanka''s online shop for mobile phone accessories',
    null, null, null,
    '/images/hero/hero-desktop-1-who.webp',
    '/images/hero/hero-mobile-1-who.webp',
    'published', 0
  ),
  (
    'Get 5% off your order — limited-time discount, use code 1ST ORDER',
    null, null, '/coupons',
    '/images/hero/hero-desktop-2-click.webp',
    '/images/hero/hero-mobile-2-click.webp',
    'published', 1
  ),
  (
    'TrendyMall islandwide delivery',
    null, null, null,
    '/images/hero/hero-desktop-3-freeshipping.webp',
    '/images/hero/hero-mobile-3-freeshipping.webp',
    'published', 2
  );

-- Homepage Settings (Phase 2's other half) -- reuses Phase 1's
-- store_settings table (sql/066_store_settings.sql), group 'homepage'.
-- Defaults match the hero carousel's real current live behavior exactly
-- (DEFAULT_SLIDE_DURATION = 4000 in SlideCarousel.tsx; autoplay/arrows/
-- dots are unconditionally on today), so this is a no-op until an admin
-- changes something.
insert into public.store_settings (key, value, type, group_name, description) values
  ('homepage.hero_enabled', 'true', 'boolean', 'homepage', 'Show the homepage hero carousel'),
  ('homepage.hero_autoplay', 'true', 'boolean', 'homepage', 'Auto-advance hero slides'),
  ('homepage.hero_slide_duration_ms', '4000', 'number', 'homepage', 'Milliseconds each hero slide is shown'),
  ('homepage.hero_show_arrows', 'true', 'boolean', 'homepage', 'Show prev/next arrows on the hero carousel'),
  ('homepage.hero_show_dots', 'true', 'boolean', 'homepage', 'Show dot indicators on the hero carousel');
