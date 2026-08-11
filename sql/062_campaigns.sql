-- Phase 1 of the Campaign & Promotion Management System.
--
-- Three new, purely additive tables: campaigns, campaign_sections, campaign_items.
-- No existing table, function, or RPC is touched by this migration. Reuses
-- public.is_admin() and public.set_updated_at(), both defined in 001_schema.sql.
--
-- Campaign pricing is an additional layer on top of product_variants.regular_price/
-- sale_price — it never overwrites either column. A later phase will extend the
-- centralized pricing functions in lib/utils.ts (getVariantPrice/pickWinningVariant)
-- and lib/data/products.ts (resolveCardDisplay) to read campaign_items.campaign_price;
-- this migration only lays down the schema those functions will read from.

-- ── campaigns ────────────────────────────────────────────────────────────
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,

  -- Admin-controlled lifecycle only. Runtime state (scheduled/active/ended) is
  -- ALWAYS derived from start_at/end_at vs now() at query/display time —
  -- never stored, never trusted stale for pricing decisions.
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  is_archived boolean not null default false,

  promotion_type text not null
    check (promotion_type in ('product_discount', 'flash_sale', 'free_shipping', 'coupon')),

  start_at timestamptz not null,
  end_at timestamptz,

  free_shipping_enabled boolean not null default false,

  desktop_banner_url text,
  mobile_banner_url text,
  thumbnail_url text,

  show_on_homepage boolean not null default false,
  show_in_shop boolean not null default false,
  show_badge boolean not null default false,
  badge_label text,
  show_countdown boolean not null default false,

  meta_title text,
  meta_description text,
  og_image_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaigns_end_after_start_check check (end_at is null or end_at > start_at)
);

create trigger trg_campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

create index campaigns_status_idx on public.campaigns(status);

-- ── campaign_sections ────────────────────────────────────────────────────
create table public.campaign_sections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_campaign_sections_updated_at before update on public.campaign_sections
  for each row execute function public.set_updated_at();

create index campaign_sections_campaign_id_idx on public.campaign_sections(campaign_id);

-- ── campaign_items ───────────────────────────────────────────────────────
create table public.campaign_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  section_id uuid references public.campaign_sections(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,

  campaign_price numeric(10,2) not null check (campaign_price >= 0),
  -- display-only, deliberately NOT the source of truth for pricing math
  discount_percentage numeric(5,2)
    check (discount_percentage is null or (discount_percentage between 0 and 100)),
  -- captured server-side from the variant's live price when added; admin display only
  reference_price_snapshot numeric(10,2),

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_campaign_items_updated_at before update on public.campaign_items
  for each row execute function public.set_updated_at();

create index campaign_items_campaign_id_idx on public.campaign_items(campaign_id);
create index campaign_items_variant_id_idx on public.campaign_items(variant_id);
create index campaign_items_product_id_idx on public.campaign_items(product_id);
create index campaign_items_section_id_idx on public.campaign_items(section_id);

-- Same variant can't be added twice to the SAME campaign (ambiguous price);
-- still fully allowed across DIFFERENT campaigns (admin gets a UI warning, no DB block).
create unique index campaign_items_campaign_variant_key
  on public.campaign_items(campaign_id, variant_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.campaigns enable row level security;

create policy "campaigns_select_public_or_admin" on public.campaigns
  for select using (
    public.is_admin()
    or (status = 'published' and (end_at is null or end_at > now()))
  );

create policy "campaigns_admin_write" on public.campaigns
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.campaign_sections enable row level security;

create policy "campaign_sections_select_public_or_admin" on public.campaign_sections
  for select using (
    public.is_admin()
    or (is_active and exists (
      select 1 from public.campaigns c
      where c.id = campaign_sections.campaign_id
        and c.status = 'published' and (c.end_at is null or c.end_at > now())
    ))
  );

create policy "campaign_sections_admin_write" on public.campaign_sections
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.campaign_items enable row level security;

create policy "campaign_items_select_public_or_admin" on public.campaign_items
  for select using (
    public.is_admin()
    or (is_active and exists (
      select 1 from public.campaigns c
      where c.id = campaign_items.campaign_id
        and c.status = 'published' and (c.end_at is null or c.end_at > now())
    ))
  );

create policy "campaign_items_admin_write" on public.campaign_items
  for all using (public.is_admin()) with check (public.is_admin());
