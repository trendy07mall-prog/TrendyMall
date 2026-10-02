-- The last three brand words in the database: product_variants.sku.
--
-- Found by the full scan after 096. I had checked products.sku and missed
-- the variant-level one, which is a separate column on a separate table
-- -- and it renders: "major4" still appeared once in the live HTML of the
-- retro headphones page and "magsafe" seven times on the power bank page
-- after 096 had cleaned everything else.
--
-- Variant SKUs reach the page through the variant picker's data, so they
-- are as visible to a crawler as the product-level SKU is.
--
-- Only the three carrying a brand word are changed. The same product's
-- other two variants ("10k ligh", "10k1 typ c") are left exactly as they
-- are: untidy, but they name no brand, and renaming rows for neatness is
-- not what this file is for.
--
-- New values follow the product-level SKU set in 096 (RFH-01), so the
-- variant reads as a child of its product. MWPB = Magnetic Wireless Power
-- Bank.
--
-- SAFE TO REVIEW: three statements, each matching one exact existing SKU
-- on one product. A SKU is an internal identifier -- nothing about price,
-- stock, the variant's colour, or which variant is default is touched, so
-- the picker behaves exactly as it does now.

begin;

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

commit;

-- ── VERIFY (run after committing) ──────────────────────────────────────
-- The first query should return NO ROWS.
--
-- select p.slug, v.sku, v.color_name
-- from public.product_variants v
-- join public.products p on p.id = v.product_id
-- where v.sku ~* '(airpod|apple|marshall|jbl|magsafe|major)';
--
-- And the five variants on those two products, to confirm nothing else
-- moved:
--
-- select p.slug, v.sku, v.color_name, v.is_default
-- from public.product_variants v
-- join public.products p on p.id = v.product_id
-- where p.slug in ('retro-foldable-wireless-bluetooth-headphones',
--                  'magnetic-wireless-power-bank-5000mah')
-- order by p.slug, v.sort_order;
