-- The two category descriptions held back from sql/100.
--
-- Both proposed texts claimed a product type TrendyMall does not sell:
--
--   headsets-headphones -- said "Wireless and wired options". All three
--     products are Bluetooth (spec Wired = false or unset). None is a
--     wired headphone. Two accept a 3.5mm cable as an extra: the P9's own
--     name says "3.5 mm AUX Jack", and the P47's description says
--     "Included 3.5mm cable". "Wireless and wired" reads as two kinds of
--     product on sale, which would be wrong; "some with a 3.5mm cable
--     option" is what is actually true.
--
--   earphones -- said "Wired and neckband earphones". All EIGHT products
--     on that page are Bluetooth, so again none is wired, and exactly one
--     of the eight (Lenovo HE05X) is a neckband. Replaced with the three
--     shapes genuinely on the page: in-ear true wireless, one neckband,
--     and over-ear headphones (P47, P9, Retro Foldable all appear there
--     through the Headsets/Headphones child category).
--
-- Lengths 137 and 144, inside the ~155 Google shows. Same dual purpose as
-- every other category description: the <meta name="description"> and the
-- visible intro line under the <h1>.
--
-- Cash on delivery and islandwide delivery are both supported by live
-- settings. No free-delivery claim -- that is switched off.
--
-- SAFE TO REVIEW: two statements, each matching one row by slug.

begin;

update public.categories
set description = 'Shop headphones and gaming headsets online in Sri Lanka. Wireless, some with a 3.5mm cable option. Cash on delivery, islandwide delivery.'
where slug = 'headsets-headphones';

update public.categories
set description = 'Buy earphones online in Sri Lanka. Wireless earbuds, neckband and over-ear styles with cash on delivery and islandwide delivery from TrendyMall.'
where slug = 'earphones';

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- Expect all SEVEN indexable categories to have a description now, every
-- length at or under 155.
--
-- select slug, length(description) as len, description
-- from public.categories
-- where slug in ('earbuds','power-bank','portable-speakers',
--                'trimmers-groomers-clippers','electronic',
--                'headsets-headphones','earphones')
-- order by slug;
