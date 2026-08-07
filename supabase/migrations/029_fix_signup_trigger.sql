-- Migration 029 — répare la création de compte (« Database error saving new user »)
-- À coller dans Supabase : Dashboard > SQL Editor > New query > Run.
--
-- Symptôme : toute inscription (Google comme e-mail) échoue avec
-- « Database error saving new user ». Le déclencheur on_auth_user_created
-- s'exécute sous le rôle supabase_auth_admin, dont le search_path ne contient
-- pas forcément le schéma public : les insertions non qualifiées (households,
-- household_members, dish_categories…) ne trouvent alors plus leurs tables et
-- la création de l'utilisateur est annulée.
--
-- Cette migration reprend la fonction de la migration 020 à l'identique quant
-- aux données créées, en corrigeant trois choses :
--   1. search_path fixé explicitement (public, extensions) ;
--   2. toutes les tables qualifiées par leur schéma ;
--   3. pseudo de repli si le fournisseur ne renvoie pas d'adresse e-mail.
-- Rejouable sans risque.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_household uuid;
begin
  new_household := extensions.uuid_generate_v4();
  insert into public.households (id, name) values (new_household, 'Mon foyer');
  insert into public.profiles (id, display_name, household_id)
  values (new.id, coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Nouveau membre'), new_household);
  insert into public.household_members (household_id, user_id, role) values (new_household, new.id, 'chef');

  insert into public.dish_categories (household_id, key, label, position) values
    (new_household, 'francais', 'Français', 0),
    (new_household, 'italien', 'Italien', 1),
    (new_household, 'asiatique', 'Asiatique', 2),
    (new_household, 'rapide', 'Rapide', 3),
    (new_household, 'vege', 'Végé', 4),
    (new_household, 'resto', 'Resto', 5),
    (new_household, 'autre', 'Autre', 6);

  insert into public.course_types (household_id, key, label, position) values
    (new_household, 'entree', 'Entrée', 0),
    (new_household, 'plat', 'Plat', 1),
    (new_household, 'accompagnement', 'Accompagnement', 2),
    (new_household, 'fruit', 'Fruit', 3),
    (new_household, 'dessert', 'Dessert', 4),
    (new_household, 'boisson', 'Boisson', 5),
    (new_household, 'autre', 'Autre', 6);

  insert into public.grocery_categories (household_id, key, label, icon, position) values
    (new_household, 'fruits_legumes', 'Fruits & légumes', '🥦', 0),
    (new_household, 'viandes_poissons', 'Viandes & poissons', '🍗', 1),
    (new_household, 'feculents', 'Féculents', '🍞', 2),
    (new_household, 'epicerie', 'Épicerie', '🛒', 3),
    (new_household, 'epicerie_salee', 'Épicerie salée', '🥫', 4),
    (new_household, 'produits_laitiers', 'Produits laitiers', '🧀', 5),
    (new_household, 'surgeles', 'Surgelés', '🧊', 6),
    (new_household, 'boissons', 'Boissons', '🥤', 7),
    (new_household, 'autre', 'Autre', '📦', 8);

  insert into public.meal_slots (household_id, key, label, icon, position) values
    (new_household, 'petit_dej', 'Petit déj', '🍳', 0),
    (new_household, 'dejeuner', 'Déjeuner', '🌞', 1),
    (new_household, 'gouter', 'Goûter', '🍪', 2),
    (new_household, 'diner', 'Dîner', '🌙', 3),
    (new_household, 'collation', 'Collation', '🌰', 4);

  insert into public.ingredients_catalog (household_id, name, grocery_category, default_unit) values
    (new_household, 'Oignon', 'fruits_legumes', 'Pièce'),
    (new_household, 'Ail', 'fruits_legumes', 'Pièce'),
    (new_household, 'Tomate', 'fruits_legumes', 'Pièce'),
    (new_household, 'Carotte', 'fruits_legumes', 'Pièce'),
    (new_household, 'Pomme de terre', 'fruits_legumes', 'Pièce'),
    (new_household, 'Salade', 'fruits_legumes', 'Pièce'),
    (new_household, 'Poivron', 'fruits_legumes', 'Pièce'),
    (new_household, 'Concombre', 'fruits_legumes', 'Pièce'),
    (new_household, 'Citron', 'fruits_legumes', 'Pièce'),
    (new_household, 'Banane', 'fruits_legumes', 'Pièce'),
    (new_household, 'Pomme', 'fruits_legumes', 'Pièce'),
    (new_household, 'Courgette', 'fruits_legumes', 'Pièce'),
    (new_household, 'Poulet (blanc)', 'viandes_poissons', 'Gramme'),
    (new_household, 'Boeuf haché', 'viandes_poissons', 'Gramme'),
    (new_household, 'Oeufs', 'viandes_poissons', 'Pièce'),
    (new_household, 'Saumon', 'viandes_poissons', 'Gramme'),
    (new_household, 'Jambon', 'viandes_poissons', 'Pièce'),
    (new_household, 'Lardons', 'viandes_poissons', 'Gramme'),
    (new_household, 'Riz basmati', 'feculents', 'Gramme'),
    (new_household, 'Pâtes', 'feculents', 'Gramme'),
    (new_household, 'Pain', 'feculents', 'Pièce'),
    (new_household, 'Farine', 'feculents', 'Gramme'),
    (new_household, 'Semoule', 'feculents', 'Gramme'),
    (new_household, 'Quinoa', 'feculents', 'Gramme'),
    (new_household, 'Huile d''olive', 'epicerie', 'Cuillère à soupe'),
    (new_household, 'Sel', 'epicerie', 'Pincée'),
    (new_household, 'Poivre', 'epicerie', 'Pincée'),
    (new_household, 'Sucre', 'epicerie', 'Cuillère à soupe'),
    (new_household, 'Vinaigre', 'epicerie', 'Cuillère à soupe'),
    (new_household, 'Moutarde', 'epicerie', 'Cuillère à soupe'),
    (new_household, 'Sauce soja', 'epicerie', 'Cuillère à soupe'),
    (new_household, 'Tomates concassées', 'epicerie_salee', 'Pièce'),
    (new_household, 'Lait de coco', 'epicerie_salee', 'ML'),
    (new_household, 'Bouillon cube', 'epicerie_salee', 'Pièce'),
    (new_household, 'Pois chiches cuits', 'epicerie_salee', 'Gramme'),
    (new_household, 'Lentilles cuites', 'epicerie_salee', 'Gramme'),
    (new_household, 'Thon en boîte', 'epicerie_salee', 'Pièce'),
    (new_household, 'Lait', 'produits_laitiers', 'ML'),
    (new_household, 'Beurre', 'produits_laitiers', 'Gramme'),
    (new_household, 'Crème fraîche', 'produits_laitiers', 'Cuillère à soupe'),
    (new_household, 'Fromage râpé', 'produits_laitiers', 'Gramme'),
    (new_household, 'Yaourt', 'produits_laitiers', 'Pièce'),
    (new_household, 'Parmesan', 'produits_laitiers', 'Gramme'),
    (new_household, 'Petits pois surgelés', 'surgeles', 'Gramme'),
    (new_household, 'Épinards surgelés', 'surgeles', 'Gramme'),
    (new_household, 'Eau', 'boissons', 'ML'),
    (new_household, 'Jus d''orange', 'boissons', 'ML');

  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

-- Le déclencheur lui-même est inchangé : on le recrée pour être sûr qu'il
-- pointe bien sur la fonction corrigée.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
