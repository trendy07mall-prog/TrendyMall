-- store_settings.updated_by blocks deleting a staff account.
--
-- sql/066 declared it as:
--
--   updated_by uuid references auth.users(id)
--
-- with no ON DELETE clause, so it defaults to NO ACTION: once an admin has
-- saved any settings group, that row holds their user id and Postgres
-- refuses to delete the account. The failure surfaces from the auth API as
-- an opaque 500 (AuthRetryableFetchError with an empty body) that retries
-- forever without ever succeeding, so nothing points at the real cause.
--
-- Found while testing the WhatsApp-number fix: a throwaway admin account
-- saved the General settings form once, which stamped it onto all 8
-- general.* rows, and the account then could not be removed until those
-- references were cleared by hand.
--
-- This is an oversight rather than a decision. Every other foreign key to
-- auth.users in this schema states its intent -- 'on delete cascade' for
-- rows that belong to the user (profiles, wishlist, reviews, cart,
-- customer_addresses) and 'on delete set null' for audit columns that
-- merely record who acted (order_status_history.changed_by,
-- customer_notes.updated_by). store_settings.updated_by is the only one
-- that says nothing.
--
-- SET NULL, matching customer_notes.updated_by, because this is an audit
-- column of exactly that kind: the setting itself must outlive whoever
-- last touched it, and "edited by an account that no longer exists" is
-- honestly represented by null. Re-pointing it at another admin would put
-- someone's name on an edit they did not make, and cascading would delete
-- live store configuration along with an ex-employee's login.
--
-- The constraint is located by column rather than by name so this does not
-- depend on the auto-generated name being what we expect.

do $$
declare
  v_constraint text;
begin
  select con.conname into v_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'store_settings'
    and con.contype = 'f'
    and con.conkey = array[
      (select attnum from pg_attribute
        where attrelid = rel.oid and attname = 'updated_by' and not attisdropped)
    ];

  if v_constraint is not null then
    execute format('alter table public.store_settings drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.store_settings
  add constraint store_settings_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- Any row still pointing at an account that is already gone cannot exist
-- (the old constraint is what prevented those deletions in the first
-- place), so no backfill is needed. From here, deleting a staff account
-- nulls their stamp on these rows instead of failing.
