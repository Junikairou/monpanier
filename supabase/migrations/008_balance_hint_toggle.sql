-- À coller dans Supabase SQL Editor > New query > Run
-- Permet de masquer l'indicateur "repas équilibré" pour les utilisateurs que
-- ça n'intéresse pas.
alter table profiles add column if not exists show_balance_hint boolean not null default true;
