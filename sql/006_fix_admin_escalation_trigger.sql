-- Fixes a bug in prevent_is_admin_escalation() (sql/001_schema.sql): it was
-- reverting is_admin changes made directly in the Supabase SQL editor, since
-- auth.uid() is null there and the trigger treated that as "an unprivileged
-- user trying to self-promote." It should only block escalation attempts
-- made by an actually logged-in, non-admin user (a real client request) —
-- not trusted server-side/SQL-editor updates, where auth.uid() is null.

create or replace function public.prevent_is_admin_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;
