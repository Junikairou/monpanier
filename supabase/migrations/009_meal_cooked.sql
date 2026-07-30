-- À coller dans Supabase SQL Editor > New query > Run
-- Ajoute une case "Cuisiné" par repas planifié, utilisée dans la vue Semaine
-- en cartes.
alter table planning_entries add column if not exists is_cooked boolean not null default false;
