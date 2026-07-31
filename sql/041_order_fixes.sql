-- Data-consistency fix: a delivered COD order with payment_status still
-- 'pending' reads as if the cash was never collected, which contradicts
-- "delivered." One-time backfill for every order already in this state —
-- the existing order_status_history trigger logs each row automatically,
-- no extra code needed here.
update public.orders
set payment_status = 'paid'
where payment_method = 'cod'
  and order_status = 'delivered'
  and payment_status <> 'paid';

-- Customer self-service cancel. Deliberately a new, separate function
-- rather than reusing cancel_order_atomic: that one is admin-only
-- (checks is_admin()) and permits cancelling any non-cancelled/returned
-- status — a customer's self-service window is narrower (pending/
-- confirmed only, matching "not after packing" — once packing has
-- started, cancelling is a support conversation, not a self-service
-- click) and the caller is the order's own owner, not an admin.
create or replace function public.cancel_own_order(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_item record;
begin
  select id, user_id, order_status into v_order from public.orders where id = p_order_id for update;

  if v_order.id is null or v_order.user_id is null or v_order.user_id <> auth.uid() then
    return false;
  end if;
  if v_order.order_status not in ('pending', 'confirmed') then
    return false;
  end if;

  for v_item in
    select product_id, quantity from public.order_items
    where order_id = p_order_id and product_id is not null
  loop
    perform public.restore_stock(v_item.product_id, v_item.quantity);
  end loop;

  update public.orders set order_status = 'cancelled' where id = p_order_id;

  return true;
end;
$$;

grant execute on function public.cancel_own_order to authenticated;
