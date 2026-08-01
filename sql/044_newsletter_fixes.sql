-- Newsletter: a narrow, self-only subscription check. subscribers SELECT
-- is admin-only under RLS (sql/016), so a logged-in customer's own
-- newsletter component can't just query the table to auto-detect an
-- existing subscription. This RPC reads only the caller's own email off
-- auth.users (never an arbitrary parameter), so it can't be used to probe
-- anyone else's subscription status.
create or replace function public.is_my_email_subscribed() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return false;
  end if;

  return exists (
    select 1 from public.subscribers where lower(email) = v_email
  );
end;
$$;

grant execute on function public.is_my_email_subscribed to authenticated;
