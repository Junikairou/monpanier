-- Mijoté — schéma de base de données
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run

create extension if not exists "uuid-ossp";

-- ---------- Plats ----------
create table if not exists dishes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('rapide','healthy','pates','vege','autre')),
  image_emoji text,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists dishes_user_id_idx on dishes(user_id);

-- ---------- Ingrédients (liés à un plat) ----------
create table if not exists ingredients (
  id uuid primary key default uuid_generate_v4(),
  dish_id uuid not null references dishes(id) on delete cascade,
  name text not null,
  quantity numeric not null default 0,
  unit text not null default '',
  grocery_category text not null default 'autre'
    check (grocery_category in (
      'fruits_legumes','viandes_poissons','epicerie','epicerie_salee',
      'produits_laitiers','surgeles','boissons','autre'
    ))
);

create index if not exists ingredients_dish_id_idx on ingredients(dish_id);

-- ---------- Étapes de recette ----------
create table if not exists recipe_steps (
  id uuid primary key default uuid_generate_v4(),
  dish_id uuid not null references dishes(id) on delete cascade,
  position int not null,
  instruction text not null
);

create index if not exists recipe_steps_dish_id_idx on recipe_steps(dish_id);

-- ---------- Planning ----------
create table if not exists planning_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('petit_dej','dejeuner','gouter','diner','collation')),
  dish_id uuid references dishes(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, date, slot, dish_id)
);

create index if not exists planning_entries_user_date_idx on planning_entries(user_id, date);

-- ---------- Liste de courses ----------
create table if not exists grocery_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric not null default 0,
  unit text not null default '',
  grocery_category text not null default 'autre'
    check (grocery_category in (
      'fruits_legumes','viandes_poissons','epicerie','epicerie_salee',
      'produits_laitiers','surgeles','boissons','autre'
    )),
  checked boolean not null default false,
  manual boolean not null default false,
  source_dish_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists grocery_items_user_id_idx on grocery_items(user_id);

-- ---------- Profils (préférences utilisateur) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  household_size int not null default 1,
  theme_preference text not null default 'auto' check (theme_preference in ('light','dark','auto')),
  language text not null default 'fr',
  units text not null default 'metric' check (units in ('metric','imperial')),
  diet text,
  updated_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table dishes enable row level security;
alter table ingredients enable row level security;
alter table recipe_steps enable row level security;
alter table planning_entries enable row level security;
alter table grocery_items enable row level security;
alter table profiles enable row level security;

create policy "dishes_owner" on dishes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ingredients_owner" on ingredients
  for all using (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()))
  with check (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()));

create policy "recipe_steps_owner" on recipe_steps
  for all using (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()))
  with check (exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid()));

create policy "planning_owner" on planning_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "grocery_owner" on grocery_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "profiles_owner" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Crée automatiquement un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
