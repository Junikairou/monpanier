-- Plats "tout prêts" (surgelés, déjà préparés, achetés en l'état) : pas de
-- recette, un seul article correspondant au plat lui-même dans la liste de
-- courses (déjà géré par la table ingredients existante, un seul row par plat).
alter table dishes add column if not exists is_ready_made boolean not null default false;
