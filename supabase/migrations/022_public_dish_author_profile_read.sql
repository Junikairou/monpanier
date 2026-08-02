-- À coller dans Supabase SQL Editor > New query > Run
-- Permet d'afficher le nom du créateur d'une recette publique (catalogue
-- communautaire, migration 021) : sans ça, le profil de l'auteur n'est lisible
-- que par les membres de son propre foyer (migration 016), donc son nom
-- resterait invisible pour les autres foyers qui consultent sa recette publique.
create policy "profiles_public_dish_author_read" on profiles
  for select using (exists (select 1 from dishes d where d.user_id = profiles.id and d.is_public = true));
