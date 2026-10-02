-- BRAND LEFTOVERS + UNTRUE PRODUCT TEXT
--
-- Two problems, both live and both visible to customers and crawlers.
--
-- PART 1 -- what sql/093's brand cleanup missed. It renamed names, slugs,
-- brands, descriptions and keywords, but three places kept the old brand
-- words, and all three render on the page:
--
--   * product_images.image_url  -> /images/headset-marshall-major-iv/2.jpg
--     These paths ship inside og:image, twitter:image AND the Product
--     JSON-LD. 11 occurrences of "marshall" and 24 of "magsafe" were
--     measured on the two live product pages.
--   * products.sku = 'major4'  -> printed as visible text ("SKU: major4")
--     and emitted as "sku" in the Product JSON-LD.
--   * product_spec_values      -> "Model = Major iv", "model = magsafe",
--     both shown in the spec table on the product page.
--
-- The image FOLDERS are renamed in the same commit as this file, and
-- next.config.ts permanently redirects every old image URL to its new
-- one, so links already shared or indexed keep working. That also means
-- the order of deploy vs. this script does not matter: whichever lands
-- first, the images still resolve.
--
-- PART 2 -- three statements the site does not actually honour:
--
--   * GTS 1345 promised "14 Day free return". The real policy is 48
--     hours, damaged items only. Replaced with the exact wording from
--     store_settings policies.returns_body, so the product page and the
--     Returns page cannot drift apart.
--   * Ven Dens VD-PB041's NAME claimed "+ Free Shipping" --
--     shipping.free_shipping_enabled is false -- and the entire name was
--     duplicated end to end (327 characters).
--   * The magnetic power bank's description was mangled by 093's own
--     regex: an iPhone compatibility list became 25 repetitions of
--     "compatible smartphones 16 Pro Max". That one is my doing.
--
-- SAFE TO REVIEW: every statement targets one row by slug, or one exact
-- image path. Wrapped in a transaction. Nothing here touches prices,
-- stock, variants, checkout, campaigns or any image FILE.

begin;

-- ════ PART 1: brand leftovers ═════════════════════════════════════════

-- 1a. image paths. Written as two scoped replacements rather than a blind
-- global one, so a path that merely happens to contain the word cannot be
-- caught by accident.
update public.product_images
set image_url = replace(
      image_url,
      '/images/headset-marshall-major-iv/',
      '/images/retro-foldable-wireless-bluetooth-headphones/')
where image_url like '/images/headset-marshall-major-iv/%';

update public.product_images
set image_url = replace(
      image_url,
      '/images/powerbank-magsafe-10000mah/',
      '/images/magnetic-wireless-power-bank/')
where image_url like '/images/powerbank-magsafe-10000mah/%';

-- 1b. the SKU. 'major4' is a Marshall model number; RFH-01 is ours and
-- means nothing to anyone else. SKUs are internal identifiers, not
-- customer-facing data, so renaming one is safe -- but it IS printed on
-- the product page and in the JSON-LD, which is why it matters here.
update public.products
set sku = 'RFH-01',
    updated_at = now()
where slug = 'retro-foldable-wireless-bluetooth-headphones'
  and sku = 'major4';

-- 1c. the two spec rows. Replaced rather than deleted, so the spec table
-- keeps the same shape it has on every other product.
update public.product_spec_values sv
set value = 'RFH-01'
from public.products p
where sv.product_id = p.id
  and p.slug = 'retro-foldable-wireless-bluetooth-headphones'
  and sv.value ~* 'major';

update public.product_spec_values sv
set value = 'Magnetic'
from public.products p
where sv.product_id = p.id
  and p.slug = 'magnetic-wireless-power-bank-5000mah'
  and sv.value ~* 'magsafe';

-- ════ PART 2: untrue text ═════════════════════════════════════════════

-- 2a. GTS 1345 -- the false returns promise, replaced with the real
-- policy's own words. "QC TESTED before we send you" and "Shipped within
-- 24 Hrs" are kept: both are claims the shop does make elsewhere
-- (/faq states orders are processed within 24 hours).
update public.products
set description = replace(
      description,
      '14 Day free return, checking warranty included.',
      'Returns are accepted only for products that arrive damaged, defective, or incorrectly shipped, and must be requested within 48 hours of receiving your order.'),
    updated_at = now()
where slug = 'gts-1345-bluetooth-speaker-portable-wireless-bass-speaker-wi';

-- 2b. Ven Dens VD-PB041 -- 327 characters, the whole name repeated, and a
-- free-shipping claim that is not true. Everything kept below is real:
-- Ven-Dens is the product's genuine brand, VD-PB041 its model, 10000mAh
-- and the 2 USB ports are in the specs. The 6-month warranty is not
-- dropped -- it stays in the description and specs, where a warranty
-- belongs, rather than in the product's name.
update public.products
set name = 'Ven-Dens VD-PB041 10000mAh Fast Charging Power Bank',
    updated_at = now()
where slug = 'original-ven-dens-power-bank-fast-charging-vd-pb041-2usb-inp';

-- 2c. the magnetic power bank -- name, then the mangled description.
--
-- The name now states both capacities it actually sells. Its four live
-- variants are 5000mAh and 10000mAh, in Type-C and Lightning, so a name
-- reading only "5000mAh" was wrong about half its own stock.
update public.products
set name = 'Magnetic Wireless Power Bank – 5000mAh / 10000mAh',
    updated_at = now()
where slug = 'magnetic-wireless-power-bank-5000mah';

-- The description was a 25-item iPhone compatibility list that 093's
-- regex turned into "compatible smartphones 16 Pro Max" repeated down the
-- page. Rather than try to repair a list that can no longer be trusted,
-- the whole mangled block is replaced by one true sentence.
--
-- regexp_replace with a greedy '^.*</ul>' and the 's' flag cuts
-- everything up to and including the LAST </ul>, which is exactly where
-- the list ends -- leaving the three inline product images that follow it
-- untouched. Done this way so the image URLs are preserved verbatim
-- rather than retyped here.
--
-- The cable note is kept because it is real and useful: no cable is
-- supplied (spec "Charging Cable Included: false").
update public.products
set description =
      '<p><strong>Works with phones that support magnetic wireless charging.</strong></p>'
      || '<p>You will need your own cable to charge the power bank. We do not provide one.</p>'
      || regexp_replace(description, '^.*</ul>', '', 's'),
    updated_at = now()
where slug = 'magnetic-wireless-power-bank-5000mah';

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- The first query is the important one: it should return NO ROWS.
--
-- select 'product' as where_found, slug, name
-- from public.products
-- where is_deleted = false and (
--   name ~* '(airpod|apple|marshall|jbl|magsafe|major\s*(iv|4)|major4)' or
--   slug ~* '(airpod|apple|marshall|jbl|magsafe|major)' or
--   coalesce(sku,'') ~* '(airpod|apple|marshall|jbl|magsafe|major)' or
--   coalesce(model,'') ~* '(airpod|apple|marshall|jbl|magsafe|major)' or
--   coalesce(keywords,'') ~* '(airpod|apple|marshall|jbl|magsafe)' or
--   coalesce(meta_title,'') ~* '(airpod|apple|marshall|jbl|magsafe)' or
--   coalesce(meta_description,'') ~* '(airpod|apple|marshall|jbl|magsafe)' or
--   description ~* '(airpod|marshall|magsafe|major\s*iv)')
-- union all
-- select 'image', image_url, '' from public.product_images
-- where image_url ~* '(airpod|apple|marshall|jbl|magsafe|major)'
-- union all
-- select 'spec', p.slug, sv.value from public.product_spec_values sv
-- join public.products p on p.id = sv.product_id
-- where sv.value ~* '(airpod|apple|marshall|jbl|magsafe|major)';
--
-- And the three rewritten rows:
--
-- select slug, name from public.products where slug in (
--   'original-ven-dens-power-bank-fast-charging-vd-pb041-2usb-inp',
--   'magnetic-wireless-power-bank-5000mah');
-- select slug, left(description, 200) from public.products
-- where slug = 'magnetic-wireless-power-bank-5000mah';
