-- Two product meta_titles that were keywords rather than product names.
--
-- Both were flagged after Phase A: the title length fix in lib/seo.ts made
-- them SHORT, but short and wrong is still wrong. A shopper scanning
-- Google results could not tell which product either one was.
--
--   GTS 1345 -- meta_title was the generic phrase "Bluetooth Speakers in
--               Sri Lanka | Portable Wireless Speakers", so the rendered
--               title named a category, not the speaker.
--   M10      -- meta_title carried the shop's own name inside it
--               ("M10 Bluetooth Earbuds Trendymall"), which the template
--               then appended again.
--
-- products.meta_title is ordinary text (unlike store_settings.value, which
-- is json -- see 094). Nothing here touches prices, stock, images,
-- checkout or any brand field.
--
-- Rendered lengths after the " | TrendyMall" suffix: 48 and 34, both well
-- inside Google's ~60 characters.

begin;

update public.products
set meta_title = 'GTS 1345 Portable Bluetooth Speaker',
    updated_at = now()
where slug = 'gts-1345-bluetooth-speaker-portable-wireless-bass-speaker-wi';

update public.products
set meta_title = 'M10 Bluetooth Earbuds',
    updated_at = now()
where slug = 'm10-tws-wireless-earbuds-bluetooth-earphone-hifi-touch-contr';

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- Expect two rows, 35 and 21 characters.
--
-- select slug, length(meta_title) as len, meta_title from public.products
-- where slug in (
--   'gts-1345-bluetooth-speaker-portable-wireless-bass-speaker-wi',
--   'm10-tws-wireless-earbuds-bluetooth-earphone-hifi-touch-contr');
