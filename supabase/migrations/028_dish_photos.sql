-- 028 — Photos de recette
-- Ajoute le stockage des photos de plat (bucket public en lecture, écriture
-- réservée au dossier de l'utilisateur) et sécurise la colonne image_url.

alter table dishes add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('dish-photos', 'dish-photos', true)
on conflict (id) do nothing;

drop policy if exists "dish_photos_public_read" on storage.objects;
create policy "dish_photos_public_read" on storage.objects
  for select using (bucket_id = 'dish-photos');

drop policy if exists "dish_photos_owner_write" on storage.objects;
create policy "dish_photos_owner_write" on storage.objects
  for insert with check (bucket_id = 'dish-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dish_photos_owner_update" on storage.objects;
create policy "dish_photos_owner_update" on storage.objects
  for update using (bucket_id = 'dish-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dish_photos_owner_delete" on storage.objects;
create policy "dish_photos_owner_delete" on storage.objects
  for delete using (bucket_id = 'dish-photos' and (storage.foldername(name))[1] = auth.uid()::text);
