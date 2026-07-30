-- À coller dans Supabase SQL Editor > New query > Run
-- Permet de marquer un créneau comme "au restaurant" (repas prévu mais sans plat),
-- pour compléter le planning sans choisir une recette.
alter table planning_entries add column if not exists is_restaurant boolean not null default false;
