-- Fixes a real gap found during Stage 3 verification: product_tags.tag_id
-- was defined with "on delete cascade", so deleting a tag directly at the
-- DB level (bypassing lib/admin/tags.ts's deleteTag() pre-check) silently
-- untagged every product with no safety net -- unlike categories/brands,
-- where the equivalent FK has no ON DELETE clause (defaults to RESTRICT)
-- and blocks the delete outright. product_tags.product_id correctly stays
-- ON DELETE CASCADE (deleting a product should clean up its own tag
-- assignments) -- only the tag_id side changes.
alter table public.product_tags drop constraint product_tags_tag_id_fkey;
alter table public.product_tags
  add constraint product_tags_tag_id_fkey foreign key (tag_id) references public.tags(id);
