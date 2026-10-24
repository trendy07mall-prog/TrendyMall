-- Two additive columns: the banner pair for a campaign's HOMEPAGE SECTION
-- (components/marketing/ActiveCampaignSections.tsx), where the campaign's
-- products sit on a white panel over the banner's lower part. A different
-- placement from desktop_banner_url/mobile_banner_url (sql/062, the
-- /campaign/[slug] hero) and product_banner_url (sql/077, the product page
-- strip), with its own shape: 4:1 on desktop and 8:5 on phones, the lower
-- part of each covered by the product cards.
--
-- Nullable and optional, also for publishing: a campaign without them
-- falls back to its landing page banner in that section.
--
-- section_bg_color is that section's background, picked per campaign; null
-- means the default red. Checked as #rrggbb here too, not only in
-- saveCampaign, because the storefront writes it straight into a style.
alter table public.campaigns
  add column section_banner_desktop_url text,
  add column section_banner_mobile_url text,
  add column section_bg_color text
    constraint campaigns_section_bg_color_hex check (section_bg_color ~ '^#[0-9a-fA-F]{6}$');
