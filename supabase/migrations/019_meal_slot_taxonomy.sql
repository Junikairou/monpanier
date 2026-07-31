-- À coller dans Supabase SQL Editor > New query > Run
-- Rend les "repas à planifier" (créneaux : petit-déj, déjeuner, goûter,
-- dîner, collation...) personnalisables par foyer, sur le même principe que
-- les catégories/types de plat/rayons (migration 013). Chaque foyer reçoit
-- les 5 créneaux actuels, qu'il peut ensuite renommer, réordonner, supprimer
-- ou compléter depuis Plus > Personnalisation.

-- 1. Table de taxonomie, par foyer
create table if not exists meal_slots (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  key text not null,
  label text not null,
  icon text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, key)
);

-- 2. RLS
alter table meal_slots enable row level security;

create policy "meal_slots_household" on meal_slots
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

-- 3. Seed : les 5 créneaux actuels, pour chaque foyer déjà existant
do $$
declare
  hh record;
begin
  for hh in select id from households loop
    insert into meal_slots (household_id, key, label, icon, position) values
      (hh.id, 'petit_dej', 'Petit déj', '🍳', 0),
      (hh.id, 'dejeuner', 'Déjeuner', '🌞', 1),
      (hh.id, 'gouter', 'Goûter', '🍪', 2),
      (hh.id, 'diner', 'Dîner', '🌙', 3),
      (hh.id, 'collation', 'Collation', '🌰', 4)
    on conflict (household_id, key) do nothing;
  end loop;
end $$;

-- 4. Les nouvelles inscriptions reçoivent aussi ces valeurs par défaut
-- (reprend la définition de la migration 018 + ajoute meal_slots)
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

  return new;
end;
$$ language plpgsql security definer;
