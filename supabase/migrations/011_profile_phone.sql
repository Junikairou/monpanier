-- À coller dans Supabase SQL Editor > New query > Run
-- Ajoute un champ téléphone (information seulement, pas utilisé pour l'auth)
-- au profil.
alter table profiles add column if not exists phone text;
