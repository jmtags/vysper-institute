-- Training image/banner support.
-- Admins can upload/manage training images. Public users can view images on training pages.

alter table public.trainings
add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-images',
  'training-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_read_training_images" on storage.objects;
create policy "public_read_training_images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'training-images');

drop policy if exists "admins_insert_training_images" on storage.objects;
create policy "admins_insert_training_images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'training-images' and public.is_admin());

drop policy if exists "admins_update_training_images" on storage.objects;
create policy "admins_update_training_images"
on storage.objects for update
to authenticated
using (bucket_id = 'training-images' and public.is_admin())
with check (bucket_id = 'training-images' and public.is_admin());

drop policy if exists "admins_delete_training_images" on storage.objects;
create policy "admins_delete_training_images"
on storage.objects for delete
to authenticated
using (bucket_id = 'training-images' and public.is_admin());
