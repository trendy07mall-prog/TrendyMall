-- Stage 4 of the catalog architecture roadmap: category-assigned
-- specification templates (EAV-style), replacing the hardcoded
-- model/compatible_devices/bluetooth columns as the live read/write path.
-- Those columns are NOT dropped -- just no longer written by the app after
-- this migration. A "General Specs" template carrying the same 3 fields is
-- created and assigned to every existing category, with existing product
-- values migrated in, so nothing visibly changes until an admin assigns a
-- different template to a category.

create table public.spec_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.spec_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.spec_templates(id) on delete cascade,
  label text not null,
  field_key text not null,
  field_type text not null default 'text' check (field_type in ('text', 'boolean', 'list')),
  unit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (template_id, field_key)
);

alter table public.categories add column spec_template_id uuid references public.spec_templates(id);

-- spec_field_id deliberately has NO "on delete cascade" -- Stage 3's
-- product_tags.tag_id originally cascaded, which let a direct DB-level tag
-- delete silently wipe every product's tag assignment with no safety net
-- (found during verification, fixed in sql/048). Blocking here from the
-- start instead: deleting a field with existing values fails at the DB
-- level, not just the app-level pre-check in lib/admin/spec-templates.ts.
create table public.product_spec_values (
  product_id uuid not null references public.products(id) on delete cascade,
  spec_field_id uuid not null references public.spec_fields(id),
  value text not null,
  primary key (product_id, spec_field_id)
);
create index product_spec_values_field_id_idx on public.product_spec_values(spec_field_id);

alter table public.spec_templates enable row level security;
alter table public.spec_fields enable row level security;
alter table public.product_spec_values enable row level security;

create policy "spec_templates_select_all" on public.spec_templates
  for select using (true);
create policy "spec_templates_insert_admin" on public.spec_templates
  for insert with check (public.is_admin());
create policy "spec_templates_update_admin" on public.spec_templates
  for update using (public.is_admin());
create policy "spec_templates_delete_admin" on public.spec_templates
  for delete using (public.is_admin());

create policy "spec_fields_select_all" on public.spec_fields
  for select using (true);
create policy "spec_fields_insert_admin" on public.spec_fields
  for insert with check (public.is_admin());
create policy "spec_fields_update_admin" on public.spec_fields
  for update using (public.is_admin());
create policy "spec_fields_delete_admin" on public.spec_fields
  for delete using (public.is_admin());

create policy "product_spec_values_select_all" on public.product_spec_values
  for select using (true);
create policy "product_spec_values_insert_admin" on public.product_spec_values
  for insert with check (public.is_admin());
create policy "product_spec_values_delete_admin" on public.product_spec_values
  for delete using (public.is_admin());
-- No update policy -- values are replaced via delete-then-insert
-- (setProductSpecValues), same as product_tags/setProductTags.

-- Seed the default template + its 3 fields.
insert into public.spec_templates (name, slug) values ('General Specs', 'general-specs');

insert into public.spec_fields (template_id, label, field_key, field_type, sort_order)
select id, 'Model', 'model', 'text', 0 from public.spec_templates where slug = 'general-specs'
union all
select id, 'Compatible Devices', 'compatible-devices', 'list', 1 from public.spec_templates where slug = 'general-specs'
union all
select id, 'Bluetooth', 'bluetooth', 'boolean', 2 from public.spec_templates where slug = 'general-specs';

-- Assign it to every existing category -- zero visible behavior change.
update public.categories
set spec_template_id = (select id from public.spec_templates where slug = 'general-specs');

-- Migrate existing product values. List values are JSON-encoded (matches
-- TagInput's existing hidden-field serialization, so that component can be
-- reused as-is for list-type fields). Booleans are the literal strings
-- "true"/"false". Bluetooth always gets a row (every product has a real
-- boolean, defaulting false) to match SpecsTable's current "always shown"
-- behavior for that row.
insert into public.product_spec_values (product_id, spec_field_id, value)
select p.id, f.id, p.model
from public.products p, public.spec_fields f
where f.field_key = 'model' and p.model is not null and trim(p.model) <> '';

insert into public.product_spec_values (product_id, spec_field_id, value)
select p.id, f.id, array_to_json(p.compatible_devices)::text
from public.products p, public.spec_fields f
where f.field_key = 'compatible-devices' and coalesce(array_length(p.compatible_devices, 1), 0) > 0;

insert into public.product_spec_values (product_id, spec_field_id, value)
select p.id, f.id, case when p.bluetooth then 'true' else 'false' end
from public.products p, public.spec_fields f
where f.field_key = 'bluetooth';
