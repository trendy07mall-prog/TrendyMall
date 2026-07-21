-- Adds real category photos (previously image_path was null for all 4
-- categories, so CategoryCard.tsx fell back to a plain letter placeholder).

update public.categories set image_path = '/images/categories/earbuds.jpg' where slug = 'earbuds';
update public.categories set image_path = '/images/categories/headset.png' where slug = 'headset';
update public.categories set image_path = '/images/categories/speaker.jpg' where slug = 'speaker';
update public.categories set image_path = '/images/categories/powerbank.jpg' where slug = 'powerbank';
