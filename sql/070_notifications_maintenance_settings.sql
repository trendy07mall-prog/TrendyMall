-- Phase 5 of the admin Settings project — Notifications, Maintenance Mode.
-- Two additions: new store_settings rows (same table as every prior
-- phase, no schema change there), and one new nullable column on
-- campaigns for the campaign-ending-soon cron's notify-once tracking.

insert into public.store_settings (key, value, type, group_name, description) values
  ('notifications.new_order_enabled', 'true', 'boolean', 'notifications', 'Email the store owner when a new order is placed (customer confirmation email is unaffected either way)'),
  ('notifications.new_review_enabled', 'true', 'boolean', 'notifications', 'Email the store owner when a customer submits a product review'),
  ('notifications.new_subscriber_enabled', 'true', 'boolean', 'notifications', 'Email the store owner when someone subscribes to the newsletter'),
  ('notifications.low_stock_enabled', 'true', 'boolean', 'notifications', 'Email the store owner when an order drops a product to low stock'),
  ('notifications.payment_received_enabled', 'true', 'boolean', 'notifications', 'Email the store owner when a payment is verified/received (bank transfer, card, or COD marked paid)'),
  ('notifications.campaign_ending_enabled', 'true', 'boolean', 'notifications', 'Email the store owner when an active campaign is ending within 24 hours (daily cron)'),

  ('maintenance.enabled', 'false', 'boolean', 'maintenance', 'Take the public storefront offline with a "back soon" page. Admin login and the admin panel are never affected.'),
  ('maintenance.message', '"We''re currently performing scheduled maintenance. We''ll be back shortly — thanks for your patience."', 'string', 'maintenance', 'Message shown to customers on the maintenance page');

-- Nullable -- null means "not yet notified" (or not applicable, e.g. no
-- end_at). Stamped by app/api/cron/campaign-ending/route.ts once a
-- campaign's owner-facing "ending soon" email has been sent, so the daily
-- cron never re-sends for the same campaign; cleared back to null by
-- lib/admin/campaigns.ts's saveCampaign whenever an admin pushes end_at
-- out beyond the 24h window again, so an extended campaign can notify a
-- second time near its new end date.
alter table public.campaigns add column if not exists ending_soon_notified_at timestamptz;
