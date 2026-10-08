-- Adds the province to both address tables, for the new area picker.
--
-- ADDITIVE AND NULLABLE, on purpose. Every existing row keeps its seven
-- columns untouched and simply has province = null; every surface that
-- renders an address (components/order/DeliveryAddressCard.tsx,
-- OrderSummaryCard, lib/invoice/InvoicePDF.tsx, ShippingLabelPDF, the admin
-- order page, lib/orders/order-detail.ts) reads the columns it always read
-- and needs no change at all. An order placed before this migration is
-- still valid, still displays, still prints.
--
-- NOT added to the CHECK constraint on district, and district itself is
-- untouched. The picker already guarantees its 25 district values match
-- that constraint exactly -- verified in lib/sri-lanka/fee-parity.test.ts,
-- which fails if a single area would be rejected by it.
--
-- Nothing here touches delivery pricing. Province is recorded for the
-- address label and for the read-only summary the customer sees; the fee
-- still comes from district + postal code + zone key via delivery_zones and
-- create_order_atomic (sql/068, sql/082), unchanged.
--
-- Safe to run more than once.

alter table public.shipping_addresses
  add column if not exists province text;

alter table public.customer_addresses
  add column if not exists province text;

comment on column public.shipping_addresses.province is
  'Sri Lankan province, e.g. "Western". Nullable: rows created before the '
  'area picker (sql/104) have none, and that is a valid, supported state.';

comment on column public.customer_addresses.province is
  'Sri Lankan province, e.g. "Western". Nullable: rows created before the '
  'area picker (sql/104) have none, and that is a valid, supported state.';

-- Check what this did:
--   select count(*) as total,
--          count(province) as with_province
--     from public.shipping_addresses;
-- Before any new order is placed, with_province should be 0 and total
-- unchanged -- the column exists but nothing has filled it yet.
