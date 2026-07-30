-- À coller dans Supabase SQL Editor > New query > Run
-- Corrige l'index de la migration 003 : un index partiel empêche Postgres de
-- résoudre les "ON CONFLICT" utilisés pour enregistrer l'état coché.
drop index if exists grocery_items_user_merge_key_uidx;

create unique index if not exists grocery_items_user_merge_key_uidx
  on grocery_items(user_id, merge_key);
