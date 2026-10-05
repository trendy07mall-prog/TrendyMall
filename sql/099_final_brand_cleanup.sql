-- FINAL BRAND CLEANUP -- everything the exhaustive scan found.
--
-- Supersedes the unapplied sql/097 and sql/098, which are folded in here
-- so this is one transaction rather than three. Neither was run; both are
-- kept in the repo for their commentary and should NOT be run separately.
--
-- Context on why this is a fourth pass. 093 renamed the products. 096
-- caught the image paths, product SKU and spec rows. 097 caught the
-- variant SKUs. This one catches the rest, found only when the scan was
-- redone over EVERY column of EVERY table instead of a hand-picked list
-- of fields. Two of my earlier "zero remaining" statements were wrong
-- because the scan behind them was narrower than it sounded.
--
-- SAFE TO REVIEW: every statement targets specific rows by primary key or
-- by exact slug/value. One transaction -- any failure applies nothing.
-- No price, stock, variant price, image file, checkout or order data is
-- touched, and no customer's comment text is altered.

begin;

-- ════ 1. variant SKUs (was sql/097) ═══════════════════════════════════
-- These render: "major4" appeared once and "magsafe" seven times in the
-- live HTML after 096 had cleaned everything else, because the variant
-- picker's data carries them.
--
-- The same products' other variants ("10k ligh", "10k1 typ c") are left
-- alone -- untidy, but naming no brand. MWPB = Magnetic Wireless Power
-- Bank; RFH-01 matches the product-level SKU set in 096.

update public.product_variants v
set sku = 'RFH-01-BLK'
from public.products p
where v.product_id = p.id
  and p.slug = 'retro-foldable-wireless-bluetooth-headphones'
  and v.sku = 'major4';

update public.product_variants v
set sku = 'MWPB-5K-LTG-WHT'
from public.products p
where v.product_id = p.id
  and p.slug = 'magnetic-wireless-power-bank-5000mah'
  and v.sku = 'magsafe 5000 light white';

update public.product_variants v
set sku = 'MWPB-5K-TYPEC-WHT'
from public.products p
where v.product_id = p.id
  and p.slug = 'magnetic-wireless-power-bank-5000mah'
  and v.sku = 'magsafe 5000 Typ c white1';

-- ════ 2. compatible_devices (was sql/098, now neutral not empty) ══════
-- Read {apple,other}. Replaced with {android,ios} so the compatibility
-- information survives instead of being thrown away: "ios" is the
-- platform, not the manufacturer, which is the distinction that matters
-- -- stating what a product works with is allowed, implying who made it
-- is not.
--
-- ARRAY[...], not a jsonb literal: compatible_devices is text[]. Checked
-- against the generated DB types this time rather than inferred from how
-- supabase-js prints it -- the client renders a text[] as ["apple","other"],
-- which looks exactly like JSON and is not, and guessing from that is
-- what made the first attempt fail.

update public.products
set compatible_devices = ARRAY['android', 'ios']::text[],
    updated_at = now()
where slug = 'magnetic-wireless-power-bank-5000mah';

-- ════ 3. reviews ══════════════════════════════════════════════════════
-- Four approved reviews still carry the old brand names in their TITLES,
-- and they display on the product pages. A review headed "AirPods Pro
-- (2nd Generation)" sitting on our own product page is a stronger
-- counterfeit signal than the product name ever was.
--
-- Matched by primary key, because two of them share the exact same title
-- and only the comment tells them apart -- an UPDATE on the title alone
-- would have hit both.
--
-- NO COMMENT TEXT IS CHANGED by any statement below.

-- 3a. Three retitled to the product's current name. Comments untouched.
update public.reviews
set title = 'Magnetic Wireless Power Bank – 5000mAh / 10000mAh'
where id = '1dbd120d-35a0-4128-bdb6-4b3233d27b62';   -- was "Apple MagSafe Battery Pack 5000mAh ..."

update public.reviews
set title = 'TWS Pro Wireless Earbuds with Charging Case'
where id = '3f918d20-89c0-41f2-8477-f302efef7f32';   -- was "Airpods Pro 2nd gen", comment "good Product for the price high quality"

update public.reviews
set title = 'TWS Pro Wireless Earbuds with Charging Case'
where id = 'e5708e68-4b33-4c37-b134-b7e44bf93eec';   -- was "AirPods Pro (2nd Generation)", comment "best"

-- 3b. The fourth is unapproved rather than retitled: its COMMENT is
-- itself the problem ("**AirPods Pro (2nd Gen)** deliver rich, detailed
-- sound with powerful Active Noise Cancellation and a natural
-- Transparency mode"), which is manufacturer marketing copy rather than
-- anything a customer wrote. Retitling would leave the body intact, and
-- editing a customer's words is not ours to do.
--
-- 'pending', not 'rejected' or deleted: the row and its text are kept
-- exactly as written, it simply stops being published, and it returns to
-- the admin moderation queue so the decision stays reversible and
-- visible. The storefront reads product_customer_reviews (sql/081),
-- which is filtered to status = 'approved', so this removes it from the
-- product page and from the rating average.
update public.reviews
set status = 'pending'
where id = 'f3d915e6-f1d4-41f6-83cf-308843c19980';

-- ════ 4. the three empty brand rows ═══════════════════════════════════
-- Apple, JBL and Marshall each have 0 products after the October rename,
-- but /brand/apple, /brand/jbl and /brand/marshall still resolve as live
-- pages titled e.g. "Apple Accessories in Sri Lanka | TrendyMall". They
-- are noindex, but they exist and are reachable.
--
-- Verified before writing this: products referencing each brand_id = 0,
-- and no product carries 'Apple', 'JBL' or 'Marshall' in the brand text
-- column either, so nothing can be orphaned by the delete.
--
-- The `using` guard is belt and braces: if a product were somehow
-- attached between this review and the run, the delete silently skips
-- that brand instead of failing or orphaning a product.
delete from public.brands b
where b.slug in ('apple', 'jbl', 'marshall')
  and not exists (select 1 from public.products p where p.brand_id = b.id);

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- 1. The whole-database sweep. Expect NO ROWS.
--
-- select 'product.' || 'name' as src, slug, name from public.products
--   where name ~* '(airpod|apple|marshall|jbl|magsafe|major4|major\s*iv|airdots|earpods)'
-- union all select 'product.sku', slug, sku from public.products
--   where sku ~* '(airpod|apple|marshall|jbl|magsafe|major)'
-- union all select 'product.compatible_devices', slug, array_to_string(compatible_devices, ',')
--   from public.products
--   where array_to_string(compatible_devices, ',') ~* '(airpod|apple|marshall|jbl|magsafe)'
-- union all select 'variant.sku', p.slug, v.sku
--   from public.product_variants v join public.products p on p.id = v.product_id
--   where v.sku ~* '(airpod|apple|marshall|jbl|magsafe|major)'
-- union all select 'image', '', image_url from public.product_images
--   where image_url ~* '(airpod|apple|marshall|jbl|magsafe|major)'
-- union all select 'spec', '', value from public.product_spec_values
--   where value ~* '(airpod|apple|marshall|jbl|magsafe|major)'
-- union all select 'review.title (published)', r.status, r.title from public.reviews r
--   where r.status = 'approved' and r.title ~* '(airpod|apple|marshall|jbl|magsafe)'
-- union all select 'brand', slug, name from public.brands
--   where name ~* '(apple|jbl|marshall)';
--
-- 2. The four reviews, confirming three retitled and one unpublished,
--    with every comment byte-identical to before:
--
-- select id, status, title, left(comment, 60) from public.reviews
-- where id in ('1dbd120d-35a0-4128-bdb6-4b3233d27b62',
--              '3f918d20-89c0-41f2-8477-f302efef7f32',
--              'e5708e68-4b33-4c37-b134-b7e44bf93eec',
--              'f3d915e6-f1d4-41f6-83cf-308843c19980');
--
-- 3. Brands gone, and nothing orphaned:
--
-- select count(*) from public.brands where slug in ('apple','jbl','marshall');
-- select count(*) from public.products where brand_id is not null
--   and brand_id not in (select id from public.brands);
