-- À coller dans Supabase SQL Editor > New query > Run
-- Permet de modifier/supprimer d'un coup toute une série de repas répétés
-- (ex. "tous les jours jusqu'au ...") : chaque insertion groupée d'une
-- répétition partage désormais un même identifiant de série. Ajoute aussi
-- une date de création, nécessaire pour l'écran "Historique" (Plus →
-- Avancé), qui liste les ajouts récents au planning.
alter table planning_entries add column if not exists recurrence_group_id uuid;
alter table planning_entries add column if not exists created_at timestamptz not null default now();
create index if not exists planning_entries_recurrence_group_idx on planning_entries(recurrence_group_id);
create index if not exists planning_entries_created_at_idx on planning_entries(created_at desc);
