-- À coller dans Supabase SQL Editor > New query > Run
-- Ajoute les macro-nutriments (saisie manuelle, optionnelle) sur les plats,
-- en complément des calories déjà présentes. Pas de calcul automatique par
-- ingrédient (pas de budget API nutrition, cf. décision du 2026-07-30).
alter table dishes add column if not exists protein_g numeric;
alter table dishes add column if not exists carbs_g numeric;
alter table dishes add column if not exists fat_g numeric;
alter table dishes add column if not exists fiber_g numeric;
