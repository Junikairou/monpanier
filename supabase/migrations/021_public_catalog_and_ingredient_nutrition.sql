-- À coller dans Supabase SQL Editor > New query > Run
-- 1. Catalogue de recettes COMMUNAUTAIRE : un plat peut être marqué "public"
-- (partagé), auquel cas il devient lisible par tous les foyers (lecture
-- seule) pour être copié dans "Mes plats" ailleurs. La création/modification/
-- suppression restent réservées à l'auteur, comme avant.
alter table dishes add column if not exists is_public boolean not null default false;

create policy "dishes_public_read" on dishes
  for select using (is_public = true);

create policy "ingredients_public_read" on ingredients
  for select using (exists (select 1 from dishes d where d.id = dish_id and d.is_public = true));

create policy "recipe_steps_public_read" on recipe_steps
  for select using (exists (select 1 from dishes d where d.id = dish_id and d.is_public = true));

-- 2. Nutriments par article du catalogue (en plus du rayon), optionnels comme
-- pour les plats (affichés seulement si l'option "Calories et nutriments" est activée).
alter table ingredients_catalog add column if not exists calories numeric;
alter table ingredients_catalog add column if not exists protein_g numeric;
alter table ingredients_catalog add column if not exists carbs_g numeric;
alter table ingredients_catalog add column if not exists fat_g numeric;
alter table ingredients_catalog add column if not exists fiber_g numeric;
