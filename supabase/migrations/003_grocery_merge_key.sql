-- À coller dans Supabase SQL Editor > New query > Run
-- Permet de garder l'état "coché" d'un ingrédient indépendamment de la période
-- (jour/semaine) affichée dans la liste de courses.
alter table grocery_items
  add column if not exists merge_key text;

update grocery_items
  set merge_key = lower(trim(name)) || '::' || lower(trim(unit))
  where manual = false and merge_key is null;

create unique index if not exists grocery_items_user_merge_key_uidx
  on grocery_items(user_id, merge_key)
  where manual = false;
