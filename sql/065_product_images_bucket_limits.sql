-- Phase 7 (security/validation review) of the Campaign & Promotion
-- Management System.
--
-- The product-images bucket (sql/003_storage.sql) has never had a
-- file_size_limit or allowed_mime_types set, unlike payment-slips
-- (sql/022_bank_transfer.sql), which already has both. Every admin image
-- uploader shares this bucket via lib/admin/uploads.ts's uploadAdminImage
-- -- including the campaign banner uploader -- so this closes the gap for
-- campaigns and every other admin image picker at once. Same values as
-- payment-slips: 5MB, jpeg/png/webp.

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';
