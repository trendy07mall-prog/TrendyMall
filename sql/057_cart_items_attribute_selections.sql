-- Found via live verification: a logged-in customer's cart round-trips
-- through cart_items on every full page navigation (fetchValidatedServerCart
-- rebuilds CartContext's items from the DB on every fresh mount, unlike a
-- guest's localStorage-backed cart which survives navigation untouched).
-- Non-color attribute selections (e.g. "Mah: 5000mah") were only ever kept
-- in memory, so they were silently lost the moment a logged-in customer
-- navigated from the PDP to /cart or /checkout -- a real order data-
-- integrity gap, not just a "won't survive a different device" limitation
-- as originally scoped. Same snapshot pattern as order_items.attribute_selections.
alter table public.cart_items
  add column attribute_selections jsonb;
