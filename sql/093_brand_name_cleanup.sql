-- BRAND-NAME CLEANUP for Google Ads policy safety.
--
-- Removes third-party brand names from products that are not genuine, and
-- strips brand words from keywords/descriptions on products that keep
-- their own names. Prices, stock, images and checkout are untouched.
--
-- SAFE TO REVIEW BEFORE RUNNING: every statement targets one product by
-- its CURRENT slug, so nothing can match a row by accident. Wrapped in a
-- transaction -- if any statement fails, nothing is applied.
--
-- ORDER MATTERS: the redirect rows are inserted BEFORE the slugs change,
-- using the old slug values, so the mapping is captured while it still
-- exists.
--
-- DEPLOY THE CODE FIRST. The query-string fix for /product/[slug] must be
-- live before these slugs change, or an ad link carrying ?variant= would
-- lose it on the redirect.

begin;

-- ── 1. redirects: old slug -> product, captured before anything moves ──
-- on conflict do nothing so re-running this file cannot fail on a row
-- that already exists.
insert into public.product_slug_redirects (old_slug, product_id)
select s.old_slug, p.id
from (values
  ('earbuds-airpods-pro-2'),
  ('powerbank-magsafe-5000mah'),
  ('headset-marshall-major-iv'),
  ('jbl-m3-mini-portable-bluetooth-speaker'),
  ('i12-tws-airpods-wireless-bluetooth-earbuds'),
  ('m19-earbuds-mic-flashlight-full-set-with-box-airdotspro-tws')
) as s(old_slug)
join public.products p on p.slug = s.old_slug
on conflict (old_slug) do nothing;

-- ── 2. the six renames ─────────────────────────────────────────────────
-- "No Brand" is the shop's existing no-brand value (brands.slug =
-- 'no-brand'), so these drop out of the Apple / Marshall / JBL brand
-- pages and filters automatically -- those read brand_id.

-- 2a. AirPods Pro (2nd Generation) -> TWS Pro Wireless Earbuds
-- No "ANC" in the new name: the current description does not state real
-- active noise cancellation, so claiming it would be inventing a spec.
update public.products set
  name  = 'TWS Pro Wireless Earbuds with Charging Case',
  slug  = 'tws-pro-wireless-earbuds-charging-case',
  brand = 'No Brand',
  brand_id = (select id from public.brands where slug = 'no-brand'),
  meta_title = 'TWS Pro Wireless Earbuds with Charging Case | TrendyMall',
  meta_description = 'Buy TWS Pro wireless Bluetooth earbuds with charging case. True wireless stereo sound, touch controls and long battery life. Cash on Delivery in Sri Lanka.',
  keywords = 'TWS Earbuds Wireless Earbuds Bluetooth Earbuds Wireless Bluetooth Earphones True Wireless Stereo Earbuds Pro Earbuds Earbuds with Charging Case',
  description = regexp_replace(description, '(?i)airpods?', 'wireless earbuds', 'g'),
  updated_at = now()
where slug = 'earbuds-airpods-pro-2';

-- 2b. Apple MagSafe Battery Pack -> magnetic power bank
update public.products set
  name  = '5000mAh Magnetic Wireless Power Bank',
  slug  = 'magnetic-wireless-power-bank-5000mah',
  brand = 'No Brand',
  brand_id = (select id from public.brands where slug = 'no-brand'),
  model = 'magnetic-5000',
  sku   = 'magnetic-5000',
  meta_title = '5000mAh Magnetic Wireless Power Bank | TrendyMall',
  meta_description = 'Buy a 5000mAh magnetic wireless power bank. Slim magnetic design, wireless charging and USB-C input. Cash on Delivery in Sri Lanka.',
  description = regexp_replace(
                  regexp_replace(description, '(?i)magsafe', 'magnetic wireless', 'g'),
                  '(?i)\miphone\M', 'compatible smartphones', 'g'),
  updated_at = now()
where slug = 'powerbank-magsafe-5000mah';

-- 2c. Marshall Major IV -> Retro Foldable Wireless Bluetooth Headphones
-- "Major-4" and "Major IV" both removed everywhere: a deliberate
-- misspelling of a brand model is itself a counterfeit signal.
update public.products set
  name  = 'Retro Foldable Wireless Bluetooth Headphones',
  slug  = 'retro-foldable-wireless-bluetooth-headphones',
  brand = 'No Brand',
  brand_id = (select id from public.brands where slug = 'no-brand'),
  model = 'retro-foldable',
  meta_title = 'Retro Foldable Wireless Bluetooth Headphones | TrendyMall',
  meta_description = 'Buy retro foldable wireless Bluetooth headphones with deep bass and long battery life. On-ear design with a classic textured finish. Cash on Delivery in Sri Lanka.',
  description = regexp_replace(
                  regexp_replace(description, '(?i)marshall', 'retro', 'g'),
                  '(?i)major[\s\-]*(iv|4)', 'foldable', 'g'),
  updated_at = now()
where slug = 'headset-marshall-major-iv';

-- 2d. JBL M3 Mini -> M3 Mini
update public.products set
  name  = 'M3 Mini Portable Bluetooth Speaker',
  slug  = 'm3-mini-portable-bluetooth-speaker',
  brand = 'No Brand',
  brand_id = (select id from public.brands where slug = 'no-brand'),
  meta_title = 'M3 Mini Portable Bluetooth Speaker | Wireless Deep Bass | TrendyMall Sri Lanka',
  meta_description = 'Buy the M3 Mini portable Bluetooth speaker at TrendyMall Sri Lanka. Powerful sound, deep bass, Bluetooth connectivity and a USB rechargeable battery.',
  keywords = 'M3 Mini Bluetooth Speaker M3 Speaker M3 Mini Speaker Mini Bluetooth Speaker Portable Bluetooth Speaker Wireless Bluetooth Speaker',
  description = regexp_replace(description, '(?i)\mjbl\M\s*', '', 'g'),
  updated_at = now()
where slug = 'jbl-m3-mini-portable-bluetooth-speaker';

-- 2e. i12 TWS Airpods -> i12 TWS  (brand column was already TWS, kept)
update public.products set
  name  = 'i12 TWS Wireless Bluetooth Earbuds',
  slug  = 'i12-tws-wireless-bluetooth-earbuds',
  meta_title = 'i12 TWS Wireless Earbuds, Bluetooth Earbuds, Wireless Earphones Sri Lanka',
  meta_description = 'Buy i12 TWS wireless Bluetooth earbuds in Sri Lanka. True wireless stereo sound with a charging case. Cash on Delivery available.',
  keywords = regexp_replace(keywords, '(?i)\s*i12 airpods', '', 'g'),
  description = regexp_replace(
                  regexp_replace(description, '(?i)airpods?', 'wireless earbuds', 'g'),
                  '(?i)\miphone\M', 'compatible smartphones', 'g'),
  updated_at = now()
where slug = 'i12-tws-airpods-wireless-bluetooth-earbuds';

-- 2f. M19 -- the name carried Airdots / Earpods / Airpods
update public.products set
  name  = 'M19 Wireless Earbuds with Mic, Flashlight & Charging Case',
  slug  = 'm19-wireless-earbuds-mic-flashlight-charging-case',
  keywords = regexp_replace(keywords, '(?i)\s*airdots pro m19', '', 'g'),
  updated_at = now()
where slug = 'm19-earbuds-mic-flashlight-full-set-with-box-airdotspro-tws';

-- ── 3. text-only cleanups (names and URLs unchanged, no redirect) ──────

-- 3a. M10: keywords and meta description carried AirPods / EarPods
update public.products set
  keywords = regexp_replace(keywords, '(?i)\s*m10 airpods', '', 'g'),
  meta_description = regexp_replace(meta_description, '(?i)\s*m10 earpods', '', 'g'),
  updated_at = now()
where slug = 'm10-tws-wireless-earbuds-bluetooth-earphone-hifi-touch-contr';

-- 3b. KTS 1330: keywords were stuffed with JBL
update public.products set
  keywords = 'KTS 1330 Bluetooth Speaker KTS Speaker Portable Bluetooth Speaker Wireless Bluetooth Speaker Speaker with Wireless Mic Karaoke Speaker',
  updated_at = now()
where slug = 'speaker-kts-1330';

-- 3c. P47: description named Samsung / Huawei / iPhone as compatibility.
-- Compatibility statements are generally allowed, but generic wording
-- removes the question entirely.
update public.products set
  description = regexp_replace(description,
                  '(?i)\m(iphone|samsung|huawei)\M', 'Android and iOS devices', 'g'),
  updated_at = now()
where slug = 'p47-wireless-headphones-with-mic-gaming-headset-foldable-ove';

-- 3d. VEN-DENS power bank: its own brand is kept, only the trailing
-- compatibility list is generalised.
update public.products set
  name = replace(name, 'For iPhone Samsung Android', 'For Android & iOS'),
  updated_at = now()
where slug = 'ven-dens-10000mah-power-bank-4-in-1-fast-charging-portable-c';

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- Expect 0 rows from the first query and 6 from the second.
--
-- select slug, name, brand from public.products
-- where is_deleted = false and (
--   name ~* '(airpod|apple|marshall|jbl|magsafe|major\s*(iv|4))' or
--   slug ~* '(airpod|apple|marshall|jbl|magsafe|major)' or
--   coalesce(keywords,'') ~* '(airpod|apple|marshall|jbl|magsafe)' or
--   coalesce(meta_title,'') ~* '(airpod|apple|marshall|jbl|magsafe)' or
--   coalesce(brand,'') in ('Apple','Marshall','JBL'));
--
-- select old_slug, p.slug as new_slug from public.product_slug_redirects r
-- join public.products p on p.id = r.product_id
-- where old_slug in ('earbuds-airpods-pro-2','powerbank-magsafe-5000mah',
--   'headset-marshall-major-iv','jbl-m3-mini-portable-bluetooth-speaker',
--   'i12-tws-airpods-wireless-bluetooth-earbuds',
--   'm19-earbuds-mic-flashlight-full-set-with-box-airdotspro-tws');
