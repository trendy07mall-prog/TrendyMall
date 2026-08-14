-- Phase 4 of the admin Settings project — Policies, SEO, Social. No schema
-- change: same public.store_settings table (sql/066), three new
-- group_name values ('policies', 'seo', 'social'). Policy bodies are
-- sanitized HTML (see lib/admin/settings.ts's POLICY_SANITIZE_OPTIONS),
-- seeded here as the exact current content of each public policy page
-- (converted from JSX to equivalent HTML) so this migration is a no-op for
-- customers until an admin actually edits something — same convention
-- every prior phase's seed data has followed.
--
-- Two deliberate content corrections vs. the literal pre-migration text:
-- Terms' "Orders & Payment" and Privacy's payment-details paragraph both
-- said "Cash on Delivery only" / "orders are currently fulfilled via Cash
-- on Delivery only" — stale since Phase 3 shipped Bank Transfer and
-- (env-gated) Card Payment. Corrected here rather than freezing a known
-- inaccuracy into the new admin-editable copy; the store owner can further
-- edit via the new Policies settings page at any time.

insert into public.store_settings (key, value, type, group_name, description) values
  ('policies.shipping_body', to_jsonb($shipping_html$<p>At TrendyMall, we are committed to delivering your orders quickly and securely across Sri Lanka.</p>
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
<p>If you have any questions about your order or delivery, our customer support team is always ready to assist you.</p>$shipping_html$::text), 'string', 'policies', 'Shipping policy page body (HTML) -- the live delivery-zone rate table renders separately, after this'),

  ('policies.returns_body', to_jsonb($returns_html$<p>Your satisfaction is important to us. Please review our return policy before making a purchase.</p>
<h2>Returns</h2>
<ul>
<li>Returns are accepted only for products that arrive damaged, defective, or incorrectly shipped.</li>
<li>Any return request must be made within 48 hours of receiving your order.</li>
</ul>
<h2>Non-Returnable Items</h2>
<p>For hygiene and quality assurance reasons, we do not accept returns or exchanges on opened or used electronic accessories, unless the item is faulty.</p>
<h2>Refunds &amp; Replacements</h2>
<p>After inspecting the returned item, TrendyMall will provide either:</p>
<ul>
<li>A replacement product (subject to stock availability), or</li>
<li>A full refund if a replacement is unavailable.</li>
</ul>
<h2>Return Conditions</h2>
<p>Returned items must:</p>
<ul>
<li>Be in their original packaging.</li>
<li>Include all accessories and documentation.</li>
<li>Show no signs of misuse or physical damage caused after delivery.</li>
</ul>
<p>For assistance, please contact our customer support team before returning any item.</p>$returns_html$::text), 'string', 'policies', 'Returns & Refunds policy page body (HTML)'),

  ('policies.privacy_body', to_jsonb($privacy_html$<p>TrendyMall ("we", "us") respects your privacy. This policy explains what information we collect when you use trendymall.lk, why we collect it, and how it's protected.</p>
<h2>Information We Collect</h2>
<p>When you create an account, place an order, or contact us, we collect:</p>
<ul>
<li>Your name, email address, and phone number</li>
<li>Your delivery address</li>
<li>Order history and the products you've purchased</li>
<li>Basic site-usage data (pages visited, general location) via Google Analytics and Meta Pixel, if enabled</li>
</ul>
<p>We do not collect or store your payment card details — card payments (when available) are processed securely by our payment partner, PayHere. Cash on Delivery and Bank Transfer orders are handled by us directly.</p>
<h2>How We Use Your Information</h2>
<ul>
<li>To process and deliver your orders</li>
<li>To send order confirmations and delivery updates</li>
<li>To respond to your questions and support requests</li>
<li>To send occasional marketing emails, only if you've subscribed to our newsletter — you can unsubscribe at any time</li>
<li>To improve our website and product range</li>
</ul>
<h2>How We Store and Protect It</h2>
<p>Your data is stored securely with Supabase, our database provider, which encrypts data in transit and at rest. Access to customer data is restricted to TrendyMall staff who need it to fulfil your order.</p>
<h2>Sharing</h2>
<p>We do not sell your personal information. We share the minimum necessary details (name, phone, address) with our delivery partners solely to deliver your order.</p>
<h2>Your Rights</h2>
<p>You can request a copy of the personal data we hold about you, ask us to correct it, or ask us to delete your account and associated data, by contacting us at <a href="mailto:trendy07mall@gmail.com">trendy07mall@gmail.com</a>.</p>
<h2>Cookies</h2>
<p>We use cookies and similar technologies for essential site functionality (like keeping items in your cart) and, where enabled, for analytics (Google Analytics) and advertising (Meta Pixel) to understand how our site is used and improve it.</p>
<h2>Changes to This Policy</h2>
<p>We may update this policy from time to time. Continued use of the site after changes means you accept the updated policy.</p>$privacy_html$::text), 'string', 'policies', 'Privacy policy page body (HTML) -- the live Contact Us block renders separately, after this'),

  ('policies.terms_body', to_jsonb($terms_html$<p>These terms govern your use of trendymall.lk and any purchase you make with us. By placing an order, you agree to these terms.</p>
<h2>Products &amp; Pricing</h2>
<p>We make every effort to display accurate product information, images, and pricing (in LKR). Prices and stock availability are subject to change without notice. If we discover a pricing error after your order is placed, we'll contact you before proceeding.</p>
<h2>Orders &amp; Payment</h2>
<p>We accept Cash on Delivery (COD), Bank Transfer, and Card Payment (where enabled) as payment methods. Placing an order is an offer to purchase, which we may accept, decline, or cancel (for example, if a product is out of stock).</p>
<h2>Delivery &amp; Shipping</h2>
<p>See our <a href="/shipping">Shipping Policy</a> for delivery times and charges. Delivery estimates are not guaranteed and may vary due to courier delays or circumstances outside our control.</p>
<h2>Returns &amp; Refunds</h2>
<p>See our <a href="/returns">Returns &amp; Refunds Policy</a> for details on damaged, defective, or incorrect items.</p>
<h2>Account Use</h2>
<p>You're responsible for keeping your account credentials confidential and for all activity under your account. Please provide accurate contact and delivery information — we're not responsible for delivery issues caused by incorrect details.</p>
<h2>Limitation of Liability</h2>
<p>TrendyMall is not liable for indirect or incidental damages arising from the use of our products or website, to the extent permitted by Sri Lankan law.</p>
<h2>Changes</h2>
<p>We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms.</p>$terms_html$::text), 'string', 'policies', 'Terms & Conditions page body (HTML) -- the live Contact Us block renders separately, after this'),

  ('policies.warranty_body', to_jsonb($warranty_html$<p>Warranty details coming soon — contact us with questions.</p>$warranty_html$::text), 'string', 'policies', 'Warranty page body (HTML) -- placeholder, no /warranty page existed before Phase 4'),

  ('seo.site_title_default', '"Premium Mobile Phone Accessories | TrendyMall Sri Lanka"', 'string', 'seo', 'Default <title> shown on pages that don''t set their own (e.g. homepage)'),
  ('seo.title_template', '"%s | TrendyMall"', 'string', 'seo', 'Suffix pattern applied to every page''s own title -- %s is replaced with that page''s title'),
  ('seo.meta_description', '"Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available."', 'string', 'seo', 'Default meta description / Open Graph description for pages that don''t set their own'),
  ('seo.og_image_url', '""', 'image', 'seo', 'Custom social preview image -- leave empty to keep using the auto-generated logo card at /opengraph-image'),

  ('social.facebook_url', '"https://www.facebook.com/share/18oKpTZ1fg/?mibextid=wwXIfr"', 'string', 'social', 'Facebook page URL -- shown in the footer and JSON-LD; leave empty to hide'),
  ('social.instagram_url', '"https://www.instagram.com/trendy_.mall_._?igsh=MTE4M2IyM3lpeWs1YQ%3D%3D&utm_source=qr"', 'string', 'social', 'Instagram profile URL -- shown in the footer and JSON-LD; leave empty to hide'),
  ('social.tiktok_url', '""', 'string', 'social', 'TikTok profile URL -- leave empty to hide'),
  ('social.youtube_url', '""', 'string', 'social', 'YouTube channel URL -- leave empty to hide'),
  ('social.twitter_url', '""', 'string', 'social', 'X (Twitter) profile URL -- leave empty to hide');
