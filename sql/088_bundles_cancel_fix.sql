-- Fixes a bug that sql/087's self-test caught: cancelling an order that
-- contained a bundle ADDED stock to the bundle's own product row.
--
-- Why it happened
-- ---------------
-- create_order_atomic deliberately does not touch a bundle's own stock --
-- it reduces the items inside it instead, because the items are what
-- physically leaves the shelf. cancel_order_atomic, however, put stock
-- back for EVERY order line that has a product_id, and a bundle's own
-- priced line has one. So an order never took stock off the bundle but a
-- cancellation gave some back, and the number climbed by the order
-- quantity every single time.
--
-- The self-test proved it exactly: the bundle's stock was set to 999,
-- two bundles were ordered (999, untouched, correct), the order was
-- cancelled, and it came back 1001.
--
-- The fix: skip the bundle's own line, so create and cancel are
-- symmetrical again. The zero-priced CONTENTS lines are ordinary
-- products and still restore exactly as before -- they are what actually
-- returns the stock, which the self-test also proves (items go 10 -> 8 ->
-- 10 and 7 -> 3 -> 7).
--
-- For an order with NO bundle in it this changes nothing whatsoever:
-- every line belongs to a product whose product_kind is 'single', so the
-- new condition is always true and the same rows restore as before.
--
-- The text below is the live definition with only that one query
-- changed, taken from the verified backup rather than retyped.

CREATE OR REPLACE FUNCTION public.cancel_order_atomic(p_order_id uuid, p_new_order_status text, p_new_payment_status text DEFAULT NULL::text, p_note text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_current_status text;
  v_item record;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select order_status into v_current_status from public.orders where id = p_order_id for update;
  if v_current_status is null or v_current_status in ('cancelled', 'returned') then
    return false;
  end if;

  for v_item in
    select oi.product_id, oi.variant_id, oi.quantity
    from public.order_items oi
    -- left join, not join: a line whose product row has somehow gone
    -- keeps behaving exactly as it did before this change.
    left join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
      and oi.product_id is not null
      -- Skip a bundle's OWN line. create_order_atomic never reduced the
      -- bundle's stock -- it reduced the items inside it -- so restoring
      -- it here was adding stock that was never taken, and the number
      -- climbed by the order quantity every time a bundle was cancelled.
      -- The contents lines are ordinary products and still restore
      -- normally, which is what actually puts the stock back.
      and coalesce(p.product_kind, 'single') <> 'bundle'
  loop
    perform public.restore_stock(v_item.product_id, v_item.quantity);
    if v_item.variant_id is not null then
      perform public.restore_variant_stock(v_item.variant_id, v_item.quantity);
    end if;
  end loop;

  perform set_config('app.status_change_note', p_note, true);

  update public.orders
  set order_status = p_new_order_status,
      payment_status = coalesce(p_new_payment_status, payment_status)
  where id = p_order_id;

  return true;
end;
$$;

grant execute on function public.cancel_order_atomic to authenticated, anon;
