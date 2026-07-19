-- TrendyMall seed data: 4 categories, 4 sample products (prices in LKR)
-- Run this after sql/003_storage.sql.

insert into public.categories (slug, name, description, sort_order) values
  ('earbuds',   'Earbuds',    'Wireless earbuds and earphones', 1),
  ('headset',   'Headsets',   'Over-ear and on-ear headphones', 2),
  ('speaker',   'Speakers',   'Bluetooth and portable speakers', 3),
  ('powerbank', 'Power Banks','Portable chargers and power banks', 4);

insert into public.products (slug, name, description, price, category_id, stock, images, is_active)
select
  'earbuds-airpods-pro-2',
  'Apple AirPods Pro (2nd Gen)',
  'Active noise cancellation, adaptive transparency, and spatial audio.',
  65000.00,
  c.id,
  25,
  array[
    '/images/earbuds-airpods-pro-2/1.jpg',
    '/images/earbuds-airpods-pro-2/2.jpg',
    '/images/earbuds-airpods-pro-2/3.jpg',
    '/images/earbuds-airpods-pro-2/4.jpg'
  ],
  true
from public.categories c where c.slug = 'earbuds';

insert into public.products (slug, name, description, price, category_id, stock, images, is_active)
select
  'speaker-kts-1330',
  'KTS 1330 Bluetooth Speaker',
  'Portable Bluetooth speaker with punchy bass and long battery life.',
  4500.00,
  c.id,
  40,
  array[
    '/images/speaker-kts-1330/1.jpg',
    '/images/speaker-kts-1330/2.jpg',
    '/images/speaker-kts-1330/3.jpg',
    '/images/speaker-kts-1330/4.jpg'
  ],
  true
from public.categories c where c.slug = 'speaker';

insert into public.products (slug, name, description, price, category_id, stock, images, is_active)
select
  'powerbank-magsafe-10000mah',
  'MagSafe Power Bank 10000mAh',
  'Magnetic wireless power bank, 10000mAh, snaps onto MagSafe-compatible phones.',
  8900.00,
  c.id,
  60,
  array[
    '/images/powerbank-magsafe-10000mah/1.jpg',
    '/images/powerbank-magsafe-10000mah/2.jpg',
    '/images/powerbank-magsafe-10000mah/3.jpg',
    '/images/powerbank-magsafe-10000mah/4.jpg'
  ],
  true
from public.categories c where c.slug = 'powerbank';

insert into public.products (slug, name, description, price, category_id, stock, images, is_active)
select
  'headset-marshall-major-iv',
  'Marshall Major IV Headphones',
  'On-ear Bluetooth headphones with iconic Marshall styling and up to 80+ hours of playback.',
  32000.00,
  c.id,
  20,
  array[
    '/images/headset-marshall-major-iv/1.jpg',
    '/images/headset-marshall-major-iv/2.jpg',
    '/images/headset-marshall-major-iv/3.jpg',
    '/images/headset-marshall-major-iv/4.jpg'
  ],
  true
from public.categories c where c.slug = 'headset';
