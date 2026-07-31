-- À coller dans Supabase SQL Editor > New query > Run
-- Corrige un bug : le planning/les courses sont partagés par foyer depuis la
-- migration 012, mais "dishes"/"ingredients"/"recipe_steps" étaient restés
-- visibles uniquement par leur créateur. Résultat : un repas ajouté par une
-- personne du foyer disparaissait pour les autres (le plat ne pouvait pas
-- être lu), et ses ingrédients manquaient dans la liste de courses commune.
-- Cette migration rend les plats VISIBLES par tout le foyer (lecture seule),
-- en gardant la création/modification/suppression réservée à leur auteur
-- ("Mes plats" reste personnel pour éditer, mais doit être lisible pour que
-- le planning/les courses partagés fonctionnent).

alter table dishes add column if not exists household_id uuid references households(id);
update dishes d set household_id = pr.household_id from profiles pr where pr.id = d.user_id and d.household_id is null;
alter table dishes alter column household_id set not null;
create index if not exists dishes_household_idx on dishes(household_id);

drop policy if exists "dishes_owner" on dishes;
create policy "dishes_household_read" on dishes
  for select using (household_id = my_household_id());
create policy "dishes_owner_write" on dishes
  for insert with check (auth.uid() = user_id and household_id = my_household_id());
create policy "dishes_owner_update" on dishes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dishes_owner_delete" on dishes
  for delete using (auth.uid() = user_id);

drop policy if exists "ingredients_owner" on ingredients;
create policy "ingredients_household_read" on ingredients
  for select using (exists (select 1 from dishes d where d.id = dish_id and d.household_id = my_household_id()));
create policy "ingredients_owner_write" on ingredients
  for insert with check (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()));
create policy "ingredients_owner_update" on ingredients
  for update using (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()))
  with check (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()));
create policy "ingredients_owner_delete" on ingredients
  for delete using (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()));

drop policy if exists "recipe_steps_owner" on recipe_steps;
create policy "recipe_steps_household_read" on recipe_steps
  for select using (exists (select 1 from dishes d where d.id = dish_id and d.household_id = my_household_id()));
create policy "recipe_steps_owner_write" on recipe_steps
  for insert with check (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()));
create policy "recipe_steps_owner_update" on recipe_steps
  for update using (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()))
  with check (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()));
create policy "recipe_steps_owner_delete" on recipe_steps
  for delete using (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()));

-- Nouvelles inscriptions : dishes reçoit aussi household_id désormais (le
-- reste du trigger était déjà à jour depuis la migration 013)
-- (rien à changer ici : l'insertion de dishes se fait côté app, pas dans ce trigger)

-- ---------- Photo de profil ----------
alter table profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Voir les profils des membres du foyer (photo, pseudo) ----------
create policy "profiles_household_read" on profiles
  for select using (household_id = my_household_id());
