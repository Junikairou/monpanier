-- Permet à l'invité d'accepter ou refuser une invitation à un repas, au lieu
-- qu'elle soit simplement visible. Tant qu'elle n'est pas acceptée, l'invité
-- ne voit pas encore les plats/la liste de courses (RLS resserrée ci-dessous).

alter table meal_invites add column if not exists status text not null default 'pending';
alter table meal_invites drop constraint if exists meal_invites_status_check;
alter table meal_invites add constraint meal_invites_status_check check (status in ('pending', 'accepted', 'declined'));

drop policy if exists "planning_entries_invited_read" on planning_entries;
create policy "planning_entries_invited_read" on planning_entries
  for select using (exists (
    select 1 from meal_invites mi
    where mi.to_user_id = auth.uid()
      and mi.status = 'accepted'
      and mi.household_id = planning_entries.household_id
      and mi.date = planning_entries.date
      and mi.slot = planning_entries.slot
  ));

drop policy if exists "dishes_meal_invite_read" on dishes;
create policy "dishes_meal_invite_read" on dishes
  for select using (exists (
    select 1 from planning_entries pe
    join meal_invites mi
      on mi.household_id = pe.household_id and mi.date = pe.date and mi.slot = pe.slot
    where pe.dish_id = dishes.id and mi.to_user_id = auth.uid() and mi.status = 'accepted'
  ));

drop policy if exists "ingredients_meal_invite_read" on ingredients;
create policy "ingredients_meal_invite_read" on ingredients
  for select using (exists (
    select 1 from planning_entries pe
    join meal_invites mi
      on mi.household_id = pe.household_id and mi.date = pe.date and mi.slot = pe.slot
    where pe.dish_id = ingredients.dish_id and mi.to_user_id = auth.uid() and mi.status = 'accepted'
  ));

drop policy if exists "recipe_steps_meal_invite_read" on recipe_steps;
create policy "recipe_steps_meal_invite_read" on recipe_steps
  for select using (exists (
    select 1 from planning_entries pe
    join meal_invites mi
      on mi.household_id = pe.household_id and mi.date = pe.date and mi.slot = pe.slot
    where pe.dish_id = recipe_steps.dish_id and mi.to_user_id = auth.uid() and mi.status = 'accepted'
  ));
