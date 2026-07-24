-- Delivery charges (Rs. 255 Western Province/Colombo, Rs. 400 elsewhere —
-- see the Shipping Policy page) are now added to the order total instead of
-- being informational-only text.

alter table public.orders
  add column shipping_fee numeric(10, 2) not null default 0;
