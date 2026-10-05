-- Meta descriptions for five of the seven indexable category pages.
--
-- categories.description does TWO jobs on this site, which is why these
-- are short:
--   1. the page's <meta name="description"> (generateMetadata), and
--   2. a visible intro line under the <h1> on the category page itself
--      (app/category/[...slug]/page.tsx renders it in a <p>).
-- Anything over ~155 characters would be truncated by Google in job 1 and
-- would read as an essay in job 2. All five below are 132-138.
--
-- Before this, six of the seven categories had NO description at all and
-- fell back to the generated placeholder ("Shop {name} at TrendyMall.
-- Best prices in Sri Lanka with cash on delivery."), which was identical
-- in shape across every page.
--
-- EVERY CLAIM WAS CHECKED against the published products in each category
-- before this file was written:
--
--   earbuds (4)            -- all four are true wireless; three carry
--                             "TWS" in their own product name.
--   power-bank (3)         -- all three are portable phone chargers.
--   portable-speakers (4)  -- all four are portable AND Bluetooth.
--   trimmers (3)           -- all three rechargeable, two say "Cordless"
--                             in their own name. (The GM-6028 charges
--                             from mains, so no "no mains" claim is made.)
--   electronic (12)        -- 4 speakers + 8 earphones/headphones, so
--                             "speakers and more" is accurate. Replaces
--                             "Wireless earbuds and earphones", which was
--                             wrong: it ignored the four speakers.
--
-- "Cash on delivery" (payment.cod_enabled = true), "islandwide delivery"
-- (delivery_zones has a default "Other Sri Lanka" zone) and "Wellampitiya"
-- (general.address) are all supported by live settings. No free-delivery
-- claim appears anywhere -- that is switched off.
--
-- TWO CATEGORIES ARE DELIBERATELY ABSENT from this file:
--   headsets-headphones -- proposed text said "Wireless and wired
--     options". All three products are Bluetooth; none is wired. Two
--     accept a 3.5mm cable as an extra.
--   earphones -- proposed text said "Wired and neckband earphones". All
--     eight are Bluetooth; none is wired, and only one of the eight is a
--     neckband.
-- Both are awaiting corrected wording rather than being loaded as-is.
--
-- SAFE TO REVIEW: five statements, each matching one row by slug. One
-- transaction. Nothing but this one text column is touched.

begin;

update public.categories
set description = 'Buy wireless earbuds online in Sri Lanka. Cash on delivery and islandwide delivery from Wellampitiya. Shop TWS earbuds at TrendyMall.'
where slug = 'earbuds';

update public.categories
set description = 'Buy power banks online in Sri Lanka. Portable chargers for phones, cash on delivery and islandwide delivery from TrendyMall, Wellampitiya.'
where slug = 'power-bank';

update public.categories
set description = 'Buy Bluetooth speakers online in Sri Lanka. Portable wireless speakers with cash on delivery and islandwide delivery from TrendyMall.'
where slug = 'portable-speakers';

update public.categories
set description = 'Buy hair trimmers and clippers online in Sri Lanka. Cordless groomers with cash on delivery and islandwide delivery from TrendyMall.'
where slug = 'trimmers-groomers-clippers';

update public.categories
set description = 'Shop electronics and audio accessories online in Sri Lanka. Speakers and more, cash on delivery, islandwide delivery from TrendyMall.'
where slug = 'electronic';

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- Expect five rows, every length at or under 155, and the two absent
-- categories still showing null.
--
-- select slug, length(description) as len, description
-- from public.categories
-- where slug in ('earbuds','power-bank','portable-speakers',
--                'trimmers-groomers-clippers','electronic',
--                'headsets-headphones','earphones')
-- order by slug;
