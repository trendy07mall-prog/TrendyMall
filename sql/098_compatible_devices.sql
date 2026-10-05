-- products.compatible_devices still read ["apple","other"].
--
-- A column I had not scanned. The first two scans checked a hand-picked
-- list of fields (name, slug, sku, model, keywords, meta_*, description)
-- and missed this one entirely; it only turned up when the scan was
-- redone over EVERY column of every table instead. It ships in the page
-- payload, so it is as visible to a crawler as any other field.
--
-- Set to an empty array rather than a value like "All": this power bank
-- needs a phone that supports magnetic wireless charging, so "All" would
-- replace a brand name with a false claim. Empty is what 13 of the other
-- products already carry, and the real compatibility statement is now in
-- the description ("Works with phones that support magnetic wireless
-- charging", set in 096).
--
-- SAFE TO REVIEW: one statement, one row, matched by slug.

begin;

update public.products
set compatible_devices = '[]'::jsonb,
    updated_at = now()
where slug = 'magnetic-wireless-power-bank-5000mah';

commit;

-- ── VERIFY ─────────────────────────────────────────────────────────────
-- Expect [] and no rows from the second query.
--
-- select slug, compatible_devices from public.products
-- where slug = 'magnetic-wireless-power-bank-5000mah';
--
-- select slug, compatible_devices from public.products
-- where compatible_devices::text ~* '(airpod|apple|marshall|jbl|magsafe|major)';
