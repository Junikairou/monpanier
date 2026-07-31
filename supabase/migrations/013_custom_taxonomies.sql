-- À coller dans Supabase SQL Editor > New query > Run
-- Rend les "types de plat", "catégories de plat" et "rayons" (catégories de
-- courses) personnalisables par foyer, au lieu de listes figées dans le code.
-- Chaque foyer reçoit les valeurs par défaut actuelles, qu'il peut ensuite
-- renommer, réordonner, supprimer ou compléter depuis Plus > Personnalisation.

-- 1. Tables de taxonomies, par foyer
create table if not exists dish_categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  key text not null,
  label text not null,
  icon text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, key)
);

create table if not exists course_types (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  key text not null,
  label text not null,
  icon text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, key)
);

create table if not exists grocery_categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  key text not null,
  label text not null,
  icon text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, key)
);

-- 2. Retire les contraintes figées : les valeurs valides sont désormais
-- gérées par foyer dans les tables ci-dessus (pas de contrainte stricte en
-- base, sinon changer les valeurs deviendrait aussi lourd qu'avant).
alter table dishes drop constraint if exists dishes_category_check;
alter table dishes drop constraint if exists dishes_course_type_check;
alter table ingredients drop constraint if exists ingredients_grocery_category_check;
alter table grocery_items drop constraint if exists grocery_items_grocery_category_check;

-- 3. RLS
alter table dish_categories enable row level security;
alter table course_types enable row level security;
alter table grocery_categories enable row level security;

create policy "dish_categories_household" on dish_categories
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "course_types_household" on course_types
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "grocery_categories_household" on grocery_categories
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

-- 4. Seed : valeurs par défaut (celles actuellement figées dans le code)
-- pour chaque foyer déjà existant
do $$
declare
  hh record;
begin
  for hh in select id from households loop
    insert into dish_categories (household_id, key, label, position) values
      (hh.id, 'rapide', 'Rapide', 0),
      (hh.id, 'healthy', 'Healthy', 1),
      (hh.id, 'pates', 'Pâtes', 2),
      (hh.id, 'vege', 'Végé', 3),
      (hh.id, 'autre', 'Autre', 4)
    on conflict (household_id, key) do nothing;

    insert into course_types (household_id, key, label, position) values
      (hh.id, 'entree', 'Entrée', 0),
      (hh.id, 'plat', 'Plat', 1),
      (hh.id, 'accompagnement', 'Accompagnement', 2),
      (hh.id, 'fruit', 'Fruit', 3),
      (hh.id, 'dessert', 'Dessert', 4),
      (hh.id, 'boisson', 'Boisson', 5),
      (hh.id, 'autre', 'Autre', 6)
    on conflict (household_id, key) do nothing;

    insert into grocery_categories (household_id, key, label, icon, position) values
      (hh.id, 'fruits_legumes', 'Fruits & légumes', '🥦', 0),
      (hh.id, 'viandes_poissons', 'Viandes & poissons', '🍗', 1),
      (hh.id, 'feculents', 'Féculents', '🍞', 2),
      (hh.id, 'epicerie', 'Épicerie', '🛒', 3),
      (hh.id, 'epicerie_salee', 'Épicerie salée', '🥫', 4),
      (hh.id, 'produits_laitiers', 'Produits laitiers', '🧀', 5),
      (hh.id, 'surgeles', 'Surgelés', '🧊', 6),
      (hh.id, 'boissons', 'Boissons', '🥤', 7),
      (hh.id, 'autre', 'Autre', '📦', 8)
    on conflict (household_id, key) do nothing;
  end loop;
end $$;

-- 5. Les nouvelles inscriptions reçoivent aussi ces valeurs par défaut
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
    (new_household, 'rapide', 'Rapide', 0),
    (new_household, 'healthy', 'Healthy', 1),
    (new_household, 'pates', 'Pâtes', 2),
    (new_household, 'vege', 'Végé', 3),
    (new_household, 'autre', 'Autre', 4);

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
