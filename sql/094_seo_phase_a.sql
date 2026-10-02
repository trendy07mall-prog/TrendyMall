-- PHASE A SEO: the two values that live in the database rather than in code.
--
-- Everything else in Phase A is a code change and ships with the deploy.
-- These two cannot be, because they are editable in admin:
--
--   1. The homepage title and meta description (Settings > SEO). The live
--      description promised "chargers" and "phone cases" -- TrendyMall
--      sells neither, so this is a truthfulness fix as much as an SEO one.
--
--   2. Two product meta_titles that are 284 characters of repeated
--      keywords ("Hair Trimmer, Professional Hair Trimmer, Rechargeable
--      Hair Trimmer, ..."). The code now trims any over-long title to fit
--      Google's 60 characters, so these are already safe -- but trimming
--      284 characters of repetition leaves a title that reads like
--      repetition. These two deserve real names.
--
-- SAFE TO REVIEW: every statement targets one row by its exact key or
-- slug. Wrapped in a transaction -- if any statement fails, nothing is
-- applied. Nothing here touches prices, stock, images or checkout.
--
-- store_settings.value is a plain text column holding the string itself
-- (not JSON), matching how every other seo.* row is already stored.

begin;

-- ── 1. homepage title and meta description ─────────────────────────────
-- 44 characters rendered. The homepage now owns "mobile accessories Sri
-- Lanka"; /category/mobile-accessories is deliberately kept off that
-- phrase (see CATEGORY_TITLE_OVERRIDES in lib/seo.ts) so the two do not
-- compete.
--
-- Note this is also the fallback title for any page that sets none of its
-- own, which today is only /cart and /wishlist -- both now noindex.
update public.store_settings
set value = 'Mobile Accessories in Sri Lanka | TrendyMall',
    updated_at = now()
where key = 'seo.site_title_default';

-- 152 characters. Claims only what Settings actually has switched on:
-- cash on delivery (payment.cod_enabled = true) and delivery across Sri
-- Lanka (delivery_zones has a default "Other Sri Lanka" zone). No free
-- delivery claim -- shipping.free_shipping_enabled is false.
update public.store_settings
set value = 'Shop mobile accessories in Sri Lanka at TrendyMall – earbuds, headphones, power banks, speakers & trimmers. Cash on delivery, delivery across Sri Lanka.',
    updated_at = now()
where key = 'seo.meta_description';

-- ── 2. the two keyword-stuffed trimmer titles ──────────────────────────
-- Every word kept here is confirmed by the product's own name or
-- description, checked before writing this file:
--
--   GM-769   -- "Cordless" and "Beard" both appear in the product name.
--   Vintage T9 -- "Metal" appears in the name and the description
--                 ("Body material: metal", "All-steel design");
--                 "Electric Shaver" appears in the name.
--
-- No third-party brand names: Geemy and Vintage T9 are the products' own
-- genuine brands (brands.slug = 'geemy' / 'vintage-t9').
update public.products
set meta_title = 'Geemy GM-769 Cordless Hair & Beard Trimmer',
    updated_at = now()
where slug = 'geemy-gm-769-hair-cordless-beard-professional-clippers-barbe';

update public.products
set meta_title = 'Vintage T9 Metal Hair Clipper & Electric Shaver',
    updated_at = now()
where slug = 'metal-vintage-t9-men-s-hair-clipper-electric-shaver-recharge';

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- Expect the two seo rows to show the new text, and both meta_titles to
-- be well under 60 characters.
--
-- select key, length(value) as len, value from public.store_settings
-- where key in ('seo.site_title_default', 'seo.meta_description');
--
-- select slug, length(meta_title) as len, meta_title from public.products
-- where slug in (
--   'geemy-gm-769-hair-cordless-beard-professional-clippers-barbe',
--   'metal-vintage-t9-men-s-hair-clipper-electric-shaver-recharge');
