-- Migration 030 — rattrapage des migrations 007, 008 et 028
-- À coller dans Supabase : Dashboard > SQL Editor > New query > Run.
--
-- Ces trois migrations n'avaient jamais été exécutées. Elles sont regroupées
-- ici pour tenir en une seule requête et garder une numérotation qui se suit,
-- plutôt que de revenir en arrière dans la liste.
--
-- Conséquences de leur absence :
--   007 — choisir un thème rose ou bleu échouait ;
--   008 — colonne show_balance_hint manquante : le questionnaire de première
--         connexion refusait de s'enregistrer (« migration manquante ») ;
--   028 — colonne image_url et espace de stockage des photos absents :
--         impossible d'ajouter une photo à une recette.
--
-- Entièrement rejouable : rien ne casse si une partie était déjà passée.

-- ---------------------------------------------------------------------------
-- 007 — thèmes rose et bleu
-- ---------------------------------------------------------------------------
alter table profiles drop constraint if exists profiles_theme_preference_check;
alter table profiles add constraint profiles_theme_preference_check
  check (theme_preference in ('light','dark','auto','rose','bleu'));

-- ---------------------------------------------------------------------------
-- 008 — masquer l'indicateur « repas équilibré »
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists show_balance_hint boolean not null default true;

-- ---------------------------------------------------------------------------
-- 028 — photos de recette
-- ---------------------------------------------------------------------------
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
