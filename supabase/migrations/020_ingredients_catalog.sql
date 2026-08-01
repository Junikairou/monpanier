-- À coller dans Supabase SQL Editor > New query > Run
-- Catalogue d'articles courants par foyer, pour choisir un ingrédient existant
-- (au lieu de le retaper) quand on ajoute un plat. Pré-rempli avec des
-- articles français courants classés par rayon ; chaque foyer peut ensuite en
-- ajouter (automatique dès qu'un nom inédit est utilisé dans une recette).

-- 1. Table, par foyer
create table if not exists ingredients_catalog (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  grocery_category text not null default 'autre',
  default_unit text,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

-- 2. RLS
alter table ingredients_catalog enable row level security;

create policy "ingredients_catalog_household" on ingredients_catalog
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

-- 3. Seed : articles courants, pour chaque foyer déjà existant
do $$
declare
  hh record;
begin
  for hh in select id from households loop
    insert into ingredients_catalog (household_id, name, grocery_category, default_unit) values
      (hh.id, 'Oignon', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Ail', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Tomate', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Carotte', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Pomme de terre', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Salade', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Poivron', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Concombre', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Citron', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Banane', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Pomme', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Courgette', 'fruits_legumes', 'Pièce'),
      (hh.id, 'Poulet (blanc)', 'viandes_poissons', 'Gramme'),
      (hh.id, 'Boeuf haché', 'viandes_poissons', 'Gramme'),
      (hh.id, 'Oeufs', 'viandes_poissons', 'Pièce'),
      (hh.id, 'Saumon', 'viandes_poissons', 'Gramme'),
      (hh.id, 'Jambon', 'viandes_poissons', 'Pièce'),
      (hh.id, 'Lardons', 'viandes_poissons', 'Gramme'),
      (hh.id, 'Riz basmati', 'feculents', 'Gramme'),
      (hh.id, 'Pâtes', 'feculents', 'Gramme'),
      (hh.id, 'Pain', 'feculents', 'Pièce'),
      (hh.id, 'Farine', 'feculents', 'Gramme'),
      (hh.id, 'Semoule', 'feculents', 'Gramme'),
      (hh.id, 'Quinoa', 'feculents', 'Gramme'),
      (hh.id, 'Huile d''olive', 'epicerie', 'Cuillère à soupe'),
      (hh.id, 'Sel', 'epicerie', 'Pincée'),
      (hh.id, 'Poivre', 'epicerie', 'Pincée'),
      (hh.id, 'Sucre', 'epicerie', 'Cuillère à soupe'),
      (hh.id, 'Vinaigre', 'epicerie', 'Cuillère à soupe'),
      (hh.id, 'Moutarde', 'epicerie', 'Cuillère à soupe'),
      (hh.id, 'Sauce soja', 'epicerie', 'Cuillère à soupe'),
      (hh.id, 'Tomates concassées', 'epicerie_salee', 'Pièce'),
      (hh.id, 'Lait de coco', 'epicerie_salee', 'ML'),
      (hh.id, 'Bouillon cube', 'epicerie_salee', 'Pièce'),
      (hh.id, 'Pois chiches cuits', 'epicerie_salee', 'Gramme'),
      (hh.id, 'Lentilles cuites', 'epicerie_salee', 'Gramme'),
      (hh.id, 'Thon en boîte', 'epicerie_salee', 'Pièce'),
      (hh.id, 'Lait', 'produits_laitiers', 'ML'),
      (hh.id, 'Beurre', 'produits_laitiers', 'Gramme'),
      (hh.id, 'Crème fraîche', 'produits_laitiers', 'Cuillère à soupe'),
      (hh.id, 'Fromage râpé', 'produits_laitiers', 'Gramme'),
      (hh.id, 'Yaourt', 'produits_laitiers', 'Pièce'),
      (hh.id, 'Parmesan', 'produits_laitiers', 'Gramme'),
      (hh.id, 'Petits pois surgelés', 'surgeles', 'Gramme'),
      (hh.id, 'Épinards surgelés', 'surgeles', 'Gramme'),
      (hh.id, 'Eau', 'boissons', 'ML'),
      (hh.id, 'Jus d''orange', 'boissons', 'ML')
    on conflict (household_id, name) do nothing;
  end loop;
end $$;

-- 4. Les nouvelles inscriptions reçoivent aussi ces valeurs par défaut
-- (reprend la définition de la migration 019 + ajoute ingredients_catalog)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_household uuid;
begin
  new_household := uuid_generate_v4();
  insert into households (id, name) values (new_household, 'Mon foyer');
  insert into public.profiles (id, display_name, household_id)
  values (new.id, split_part(new.email, '@', 1), new_household);
  insert into household_members (household_id, user_id, role) values (new_household, new.id, 'chef');

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

  insert into meal_slots (household_id, key, label, icon, position) values
    (new_household, 'petit_dej', 'Petit déj', '🍳', 0),
    (new_household, 'dejeuner', 'Déjeuner', '🌞', 1),
    (new_household, 'gouter', 'Goûter', '🍪', 2),
    (new_household, 'diner', 'Dîner', '🌙', 3),
    (new_household, 'collation', 'Collation', '🌰', 4);

  insert into ingredients_catalog (household_id, name, grocery_category, default_unit) values
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
$$ language plpgsql security definer;
