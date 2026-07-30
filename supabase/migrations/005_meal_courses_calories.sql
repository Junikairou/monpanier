-- À coller dans Supabase SQL Editor > New query > Run
-- Ajoute le type de plat (entrée/plat/accompagnement/dessert/boisson/fruit/autre)
-- et les calories (saisie manuelle) sur les plats. Permet de composer un repas
-- avec plusieurs plats (ex: entrée + plat + dessert) — le planning autorisait
-- déjà plusieurs plats par créneau côté base (contrainte unique sur dish_id),
-- seule l'app limitait à un seul.
alter table dishes add column if not exists course_type text not null default 'plat';
alter table dishes drop constraint if exists dishes_course_type_check;
alter table dishes add constraint dishes_course_type_check
  check (course_type in ('entree','plat','accompagnement','dessert','fruit','boisson','autre'));

alter table dishes add column if not exists calories int;

-- Ajoute "Féculents" comme rayon de courses, utilisé aussi pour estimer
-- si un repas est équilibré (présence plat / accompagnement / fruit).
alter table ingredients drop constraint if exists ingredients_grocery_category_check;
alter table ingredients add constraint ingredients_grocery_category_check
  check (grocery_category in (
    'fruits_legumes','viandes_poissons','feculents','epicerie','epicerie_salee',
    'produits_laitiers','surgeles','boissons','autre'
  ));

alter table grocery_items drop constraint if exists grocery_items_grocery_category_check;
alter table grocery_items add constraint grocery_items_grocery_category_check
  check (grocery_category in (
    'fruits_legumes','viandes_poissons','feculents','epicerie','epicerie_salee',
    'produits_laitiers','surgeles','boissons','autre'
  ));
