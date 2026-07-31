-- À coller dans Supabase SQL Editor > New query > Run
-- Ajoute un rôle "chef de foyer" / "membre" : le premier membre d'un foyer
-- devient chef (les foyers existants : la personne arrivée en premier),
-- seul le chef peut retirer d'autres membres du foyer.

alter table household_members add column if not exists role text not null default 'membre' check (role in ('chef', 'membre'));

-- Backfill : le membre le plus ancien de chaque foyer devient chef
with first_members as (
  select distinct on (household_id) household_id, user_id
  from household_members
  order by household_id, joined_at asc
)
update household_members hm
set role = 'chef'
from first_members fm
where hm.household_id = fm.household_id and hm.user_id = fm.user_id;

-- Retirer un membre de son foyer : réservé au chef, la personne retirée
-- reçoit automatiquement son propre foyer solo (comme à l'inscription)
create or replace function remove_household_member(target_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  caller_household uuid;
  caller_role text;
  target_household uuid;
  new_household uuid;
begin
  caller_household := my_household_id();
  select role into caller_role from household_members where household_id = caller_household and user_id = auth.uid();
  if caller_role is distinct from 'chef' then
    raise exception 'Seul le chef du foyer peut retirer un membre';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Tu ne peux pas te retirer toi-même';
  end if;

  select household_id into target_household from household_members where user_id = target_user_id;
  if target_household is null or target_household <> caller_household then
    raise exception 'Cette personne ne fait pas partie de ton foyer';
  end if;

  new_household := uuid_generate_v4();
  insert into households (id, name) values (new_household, 'Mon foyer');
  delete from household_members where household_id = caller_household and user_id = target_user_id;
  insert into household_members (household_id, user_id, role) values (new_household, target_user_id, 'chef');
  update profiles set household_id = new_household where id = target_user_id;

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
end;
$$;

-- Les nouvelles inscriptions sont chef de leur propre foyer solo
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

  return new;
end;
$$ language plpgsql security definer;

-- Rejoindre un foyer avec un code : toujours en tant que "membre"
create or replace function join_household_with_code(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target_household uuid;
begin
  select household_id into target_household
  from household_invites
  where code = p_code and expires_at > now();

  if target_household is null then
    raise exception 'Code invalide ou expiré';
  end if;

  insert into household_members (household_id, user_id, role)
  values (target_household, auth.uid(), 'membre')
  on conflict (household_id, user_id) do nothing;

  update profiles set household_id = target_household where id = auth.uid();

  delete from household_invites where code = p_code;

  return target_household;
end;
$$;
