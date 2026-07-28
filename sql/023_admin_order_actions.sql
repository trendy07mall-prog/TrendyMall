-- Payment & Order Management System (v10), Phase 4 — Admin Orders Panel.

-- Admin-only, security-definer, restores stock atomically across every
-- line item and guards against double-restoring (cancelling an already-
-- cancelled/returned order is a safe no-op, not a double stock credit).
-- Checks is_admin() internally (not just at the calling Server Action
-- layer) since security-definer functions bypass RLS — without this,
-- any authenticated user could call it directly via .rpc() and cancel/
-- refund arbitrary orders.
create or replace function public.cancel_order_atomic(
  p_order_id uuid,
  p_new_order_status text,
  p_new_payment_status text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
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
    select product_id, quantity from public.order_items
    where order_id = p_order_id and product_id is not null
  loop
    perform public.restore_stock(v_item.product_id, v_item.quantity);
  end loop;

  update public.orders
  set order_status = p_new_order_status,
      payment_status = coalesce(p_new_payment_status, payment_status)
  where id = p_order_id;

  return true;
end;
$$;

grant execute on function public.cancel_order_atomic to authenticated;
