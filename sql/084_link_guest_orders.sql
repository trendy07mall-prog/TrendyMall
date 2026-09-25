-- Guest orders never reach the account that later owns them.
--
-- A guest order is an ordinary orders row with user_id NULL (nullable
-- since sql/020, allowed through by sql/033's guest checkout). Nothing in
-- signup or login ever looks for past orders matching the new account's
-- e-mail, so they stay NULL forever -- and orders_select_own_or_admin is
-- `auth.uid() = user_id`, where `auth.uid() = NULL` is never true. The row
-- exists and no signed-in customer can ever see it. "My Orders" is empty
-- and there is no filter to relax; it is invisible by policy.
--
-- Why this is gated on a CONFIRMED e-mail
-- ---------------------------------------
-- customer_email on an order is whatever the guest typed. It is not proof
-- of anything. If linking ran at signup, anyone could type a stranger's
-- address, create an account and absorb that person's order history --
-- their name, phone, delivery address and what they spent. That is not
-- hypothetical on this database: 7 of 16 accounts are currently
-- unconfirmed.
--
-- So the match requires auth.users.email_confirmed_at to be set, and the
-- e-mail is read from the caller's own auth.users row -- never passed in
-- as an argument, which would let a client ask to link any address it
-- liked. Supabase already blocks sign-in until the address is confirmed,
-- so "has a session" already means "proved control of that mailbox"; this
-- rides on that existing guarantee rather than inventing a new one.
--
-- Accepted residual risk: a guest who mistypes their e-mail as someone
-- else's hands that one order to the wrong account. Rare, bounded to a
-- single order's address and phone, and the alternative (also requiring a
-- phone match) would silently fail most legitimate links.
--
-- SECURITY DEFINER is required, not convenience: the caller must update
-- rows they do not yet own, which orders_update_admin correctly forbids.
-- The function's own WHERE clause is the authorisation.
create or replace function public.link_guest_orders_to_current_user()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_ids uuid[];
  v_linked integer := 0;
  v_snap record;
  v_is_first boolean;
begin
  if v_user_id is null then
    return 0;
  end if;

  select u.email, u.email_confirmed_at
    into v_email, v_confirmed
  from auth.users u
  where u.id = v_user_id;

  -- Unconfirmed (or somehow e-mail-less) accounts link nothing at all.
  if v_email is null or v_confirmed is null then
    return 0;
  end if;

  with claimed as (
    update public.orders o
    set user_id = v_user_id
    where o.user_id is null
      and lower(btrim(o.customer_email)) = lower(btrim(v_email))
    returning o.id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into v_ids from claimed;

  v_linked := coalesce(array_length(v_ids, 1), 0);
  if v_linked = 0 then
    return 0;
  end if;

  -- Seed the address book from what the guest actually typed at checkout.
  -- shipping_addresses is a per-order snapshot and is the only place a
  -- guest's address exists -- customer_addresses.customer_id is NOT NULL,
  -- so a guest could never have had a row there to orphan.
  --
  -- delivery_method = 'standard' ONLY. A pickup order's snapshot holds the
  -- STORE's address (create_order_atomic substitutes the pickup location),
  -- so seeding from one would save Salawatta Road as the customer's home.
  --
  -- Newest first, so if two orders differ the most recent address is the
  -- one that becomes the default.
  for v_snap in
    select sa.first_name, sa.last_name, sa.phone, sa.street, sa.city, sa.district, sa.postal_code
    from public.orders o
    join public.shipping_addresses sa on sa.order_id = o.id
    where o.id = any(v_ids)
      and o.delivery_method = 'standard'
    order by o.created_at desc
  loop
    begin
      -- Dedupe deliberately ignores is_deleted: an address the customer
      -- has already deleted must stay deleted, not quietly reappear.
      if not exists (
        select 1
        from public.customer_addresses ca
        where ca.customer_id = v_user_id
          and lower(btrim(ca.street)) = lower(btrim(v_snap.street))
          and lower(btrim(ca.city)) = lower(btrim(v_snap.city))
          and ca.district = v_snap.district
          and coalesce(lower(btrim(ca.postal_code)), '') = coalesce(lower(btrim(v_snap.postal_code)), '')
      ) then
        select not exists (
          select 1 from public.customer_addresses
          where customer_id = v_user_id and is_default and not is_deleted
        ) into v_is_first;

        insert into public.customer_addresses
          (customer_id, first_name, last_name, phone, street, city, district, postal_code, is_default)
        values
          (v_user_id, v_snap.first_name, v_snap.last_name, v_snap.phone,
           v_snap.street, v_snap.city, v_snap.district, v_snap.postal_code, v_is_first);
      end if;
    exception when others then
      -- An address that will not insert (a district predating the CHECK
      -- list, say) must not take the order link down with it. Getting the
      -- customer their orders back is the point; the address is a bonus.
      null;
    end;
  end loop;

  return v_linked;
end;
$$;

revoke all on function public.link_guest_orders_to_current_user() from public, anon;
grant execute on function public.link_guest_orders_to_current_user() to authenticated;

-- Deliberately NOT touched here: coupon_redemptions still has guest rows
-- with user_id NULL. Attaching those retroactively could push a customer
-- past a per-customer usage limit they legitimately cleared at the time,
-- so they stay as they are.
--
-- The one-time backfill of orders placed before this function existed is a
-- separate, reviewed step -- not run from this migration.
