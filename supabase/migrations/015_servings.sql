-- À coller dans Supabase SQL Editor > New query > Run
-- Nombre de personnes par plat planifié : chaque recette déclare pour combien
-- de personnes elle est prévue de base (`base_servings`), et chaque repas
-- planifié peut ajuster ce nombre (`servings`) — la liste de courses adapte
-- les quantités en conséquence (ex. un plat pour 2 et un autre pour 1 le même
-- soir).
alter table dishes add column if not exists base_servings int not null default 4;
alter table planning_entries add column if not exists servings int not null default 4;
alter table planning_template_entries add column if not exists servings int not null default 4;
