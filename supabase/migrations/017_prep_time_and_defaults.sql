-- À coller dans Supabase SQL Editor > New query > Run
-- Ajoute le temps de préparation par plat, un réglage pour masquer les
-- champs nutrition/calories dans le formulaire (Options avancées), et
-- modernise les catégories de plat proposées par défaut aux nouveaux foyers
-- (les foyers existants ne sont pas touchés — ils gèrent déjà leurs propres
-- catégories depuis Personnalisation).

alter table dishes add column if not exists prep_minutes int;
alter table profiles add column if not exists show_nutrition_fields boolean not null default true;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_household uuid;
begin
  new_household := uuid_generate_v4();
  insert into households (id, name) values (new_household, 'Mon foyer');
  insert into public.profiles (id, display_name, household_id)
  values (new.id, split_part(new.email, '@', 1), new_household);
  insert into household_members (household_id, user_id) values (new_household, new.id);

  insert into dish_categories (household_id, key, label, position) values
    (new_household, 'francais', 'Français', 0),
    (new_household, 'italien', 'Italien', 1),
    (new_household, 'asiatique', 'Asiatique', 2),
    (new_household, 'rapide', 'Rapide', 3),
    (new_household, 'vege', 'Végé', 4),
    (new_household, 'resto', 'Resto', 5),
    (new_household, 'autre', 'Autre', 6);

  insert into course_types (household_id, key, label, position) values
    (new_household, 'entree', 'Entrée', 0),
    (new_household, 'plat', 'Plat', 1),
    (new_household, 'accompagnement', 'Accompagnement', 2),
    (new_household, 'fruit', 'Fruit', 3),
    (new_household, 'dessert', 'Dessert', 4),
    (new_household, 'boisson', 'Boisson', 5),
    (new_household, 'autre', 'Autre', 6);

  insert into grocery_categories (household_id, key, label, icon, position) values
    (new_household, 'fruits_legumes', 'Fruits & légumes', '🥦', 0),
    (new_household, 'viandes_poissons', 'Viandes & poissons', '🍗', 1),
    (new_household, 'feculents', 'Féculents', '🍞', 2),
    (new_household, 'epicerie', 'Épicerie', '🛒', 3),
    (new_household, 'epicerie_salee', 'Épicerie salée', '🥫', 4),
    (new_household, 'produits_laitiers', 'Produits laitiers', '🧀', 5),
    (new_household, 'surgeles', 'Surgelés', '🧊', 6),
    (new_household, 'boissons', 'Boissons', '🥤', 7),
    (new_household, 'autre', 'Autre', '📦', 8);

  return new;
end;
$$ language plpgsql security definer;
