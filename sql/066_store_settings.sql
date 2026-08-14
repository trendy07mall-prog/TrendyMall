-- Store Settings foundation (Phase 1 of the admin Settings project).
-- A generic key/value config table -- confirmed via a full audit of all
-- prior migrations that nothing like this already exists (bank_transfer_
-- settings and site_banner are both narrow, single-purpose tables, not a
-- general settings store). This becomes the single source of truth that
-- existing storefront components read from; it does not replace or touch
-- checkout/orders/campaigns/coupons/product logic.
create table public.store_settings (
  key text primary key,
  value jsonb not null,
  type text not null check (type in ('string', 'number', 'boolean', 'json', 'image', 'color')),
  group_name text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.store_settings enable row level security;

-- Public select: every Phase 1 value (store name, hours, WhatsApp number,
-- announcement text, logo URLs) is customer-visible on the storefront by
-- design. No secret ever belongs in this table (PayHere keys etc. stay in
-- env vars only, established in a later phase) -- so a blanket public read
-- is safe, matching the same policy shape already used by site_banner.
create policy "store_settings_select_all" on public.store_settings
  for select using (true);

create policy "store_settings_admin_write" on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed every Phase 1 key with TODAY'S REAL LIVE VALUES (not blank), so this
-- migration is a no-op for visitors until an admin actually changes
-- something through the new Settings UI. Values below are copied verbatim
-- from the current hardcoded sources found in the pre-implementation audit
-- (app/layout.tsx, components/layout/Footer.tsx, app/contact/page.tsx,
-- components/layout/NavbarClient.tsx, app/icon.tsx, components/admin/
-- AdminSidebar.tsx, components/layout/AnnouncementBar.tsx).
insert into public.store_settings (key, value, type, group_name, description) values
  ('general.store_name', '"TrendyMall"', 'string', 'general', 'Store name shown across the site'),
  ('general.tagline', '"Sri Lanka''s trusted destination for premium mobile phone accessories."', 'string', 'general', 'Short tagline (footer, brand references)'),
  ('general.description', '"Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available."', 'string', 'general', 'Default site description'),
  ('general.email', '"trendy07mall@gmail.com"', 'string', 'general', 'Support email address'),
  ('general.phone', '"+94750187145"', 'string', 'general', 'Support phone number (E.164)'),
  ('general.whatsapp_number', '"94775312484"', 'string', 'general', 'WhatsApp contact number (digits only, no +)'),
  ('general.address', '"Salawatta Road, Wellampitiya, Sri Lanka"', 'string', 'general', 'Store address'),
  ('general.currency', '"LKR"', 'string', 'general', 'Store currency (locked)'),
  ('general.timezone', '"Asia/Colombo"', 'string', 'general', 'Store timezone (locked)'),
  ('general.business_hours', '{
     "mon": {"open": "10:00", "close": "16:00", "closed": false},
     "tue": {"open": "10:00", "close": "16:00", "closed": false},
     "wed": {"open": "10:00", "close": "16:00", "closed": false},
     "thu": {"open": "10:00", "close": "16:00", "closed": false},
     "fri": {"open": "10:00", "close": "16:00", "closed": false},
     "sat": {"open": "10:00", "close": "16:00", "closed": false},
     "sun": {"open": "10:00", "close": "16:00", "closed": false}
   }', 'json', 'general', 'Per-day business hours'),
  ('branding.logo_desktop_url', '"/images/logo/trendymall-logo.png"', 'image', 'branding', 'Desktop header logo'),
  ('branding.logo_mobile_url', '"/images/logo/trendymall-logo.png"', 'image', 'branding', 'Mobile header logo'),
  ('branding.favicon_url', '"/images/logo/trendymall-mark.png"', 'image', 'branding', 'Browser tab favicon source image'),
  ('branding.admin_logo_url', '"/images/logo/trendymall-mark.png"', 'image', 'branding', 'Admin sidebar mark'),
  ('branding.color_primary', '"#111111"', 'color', 'branding', 'Brand primary color (reference only -- does not yet override live site CSS)'),
  ('branding.color_accent', '"#f97316"', 'color', 'branding', 'Brand accent color (reference only)'),
  ('branding.color_success', '"#22c55e"', 'color', 'branding', 'Success color (reference only)'),
  ('contact.whatsapp_enabled', 'true', 'boolean', 'contact', 'Show the floating WhatsApp button'),
  ('contact.whatsapp_default_message', '"Hi! I have a question about my order."', 'string', 'contact', 'Prefilled WhatsApp message'),
  ('announcement.enabled', 'true', 'boolean', 'announcement', 'Show the top announcement bar'),
  ('announcement.messages', '[
     {"kind": "delivery_in_zone", "icon": "truck"},
     {"kind": "delivery_outside_zone", "icon": "truck"},
     {"kind": "custom", "icon": "cash", "text": "Cash on Delivery"},
     {"kind": "whatsapp", "icon": "whatsapp", "text": "Need Help? WhatsApp Us"}
   ]', 'json', 'announcement', 'Up to 4 rotating messages. delivery_in_zone/delivery_outside_zone render the real shipping rate computed from lib/delivery-fee.ts, never free-typed text'),
  ('announcement.auto_rotate', 'true', 'boolean', 'announcement', 'Auto-rotate announcement messages'),
  ('announcement.rotate_speed_ms', '4000', 'number', 'announcement', 'Rotation interval in milliseconds');
