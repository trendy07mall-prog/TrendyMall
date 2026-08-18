-- Cross-page delivery-timeframe consistency fix.
--
-- The store owner explicitly chose "Colombo 1-2 working days, other areas
-- 2-4 working days" as the real sitewide delivery-time claim (first stated
-- on the About page, now propagated everywhere: this Settings row,
-- lib/delivery.ts's computed "Get it by" dates at checkout/cart/PDP,
-- WhyShopWithUs, TrustBadges, ProductTabs, and the FAQ). This migration
-- updates the ALREADY-SEEDED policies.shipping_body row (sql/069) to match.
--
-- Guarded by `where value = to_jsonb(<old text>)` so this is a no-op if an
-- admin has since edited the Shipping policy away from the seeded default
-- -- their edit is never silently overwritten.

update public.store_settings
set value = to_jsonb($shipping_html$<p>At TrendyMall, we are committed to delivering your orders quickly and securely across Sri Lanka.</p>
<h2>Delivery Time</h2>
<ul>
<li>Colombo 01–15: 1–2 working days</li>
<li>Other areas: 2–4 working days</li>
<li>These timeframes are estimated, not guaranteed — actual delivery can vary by location and courier availability</li>
<li>Orders are processed within 24 hours after confirmation (excluding Sundays and public holidays)</li>
</ul>
<h2>Cash on Delivery</h2>
<p>Cash on Delivery (COD) is available for eligible orders across Sri Lanka.</p>
<h2>Order Tracking</h2>
<p>Once your order has been dispatched, you will receive tracking updates via WhatsApp, SMS, and email.</p>
<h2>Delivery Coverage</h2>
<p>We deliver to all major cities and most areas across Sri Lanka.</p>
<p>If you have any questions about your order or delivery, our customer support team is always ready to assist you.</p>$shipping_html$::text),
    updated_at = now()
where key = 'policies.shipping_body'
  and value = to_jsonb($old_shipping_html$<p>At TrendyMall, we are committed to delivering your orders quickly and securely across Sri Lanka.</p>
<h2>Delivery Time</h2>
<ul>
<li>Standard islandwide delivery: 3–5 business days</li>
<li>Orders are processed within 24 hours after confirmation (excluding Sundays and public holidays)</li>
</ul>
<h2>Cash on Delivery</h2>
<p>Cash on Delivery (COD) is available for eligible orders across Sri Lanka.</p>
<h2>Order Tracking</h2>
<p>Once your order has been dispatched, you will receive tracking updates via WhatsApp, SMS, and email.</p>
<h2>Delivery Coverage</h2>
<p>We deliver to all major cities and most areas across Sri Lanka.</p>
<p>If you have any questions about your order or delivery, our customer support team is always ready to assist you.</p>$old_shipping_html$::text);
