-- À coller dans Supabase SQL Editor > New query > Run
-- Partie "Amis" : identifiant public Pseudo#1234 (façon Discord), demandes
-- d'ami, envoi d'une recette à un ami précis, invitation d'un ami à un repas
-- (il voit le repas et sa liste de courses).
-- Rejouable sans erreur (drop policy if exists avant chaque create policy).

-- ---------------------------------------------------------------------------
-- 1. Identifiant public : Pseudo#1234
-- Le tag est un nombre à 4 chiffres, unique POUR UN MÊME PSEUDO (deux personnes
-- peuvent s'appeler "Marie" mais auront Marie#0421 et Marie#7788).
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists tag text;

create or replace function public.ensure_profile_tag() returns trigger as $$
declare
  candidate text;
  attempts int := 0;
begin
  -- Pseudo inchangé et tag déjà présent : on garde tel quel.
  if tg_op = 'UPDATE' and new.tag is not null
     and lower(coalesce(new.display_name, '')) = lower(coalesce(old.display_name, '')) then
    return new;
  end if;
  -- Tag déjà présent et toujours libre pour ce pseudo : on le garde.
  if new.tag is not null and not exists (
    select 1 from public.profiles p
    where p.id <> new.id and p.tag = new.tag
      and lower(coalesce(p.display_name, '')) = lower(coalesce(new.display_name, ''))
  ) then
    return new;
  end if;
  loop
    candidate := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (
      select 1 from public.profiles p
      where p.id <> new.id and p.tag = candidate
        and lower(coalesce(p.display_name, '')) = lower(coalesce(new.display_name, ''))
    );
    attempts := attempts + 1;
    exit when attempts > 60;
  end loop;
  new.tag := candidate;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists profiles_ensure_tag on profiles;
create trigger profiles_ensure_tag
  before insert or update on profiles
  for each row execute function public.ensure_profile_tag();

-- Attribue un tag à tous les comptes déjà existants (le trigger s'en charge).
update public.profiles set tag = tag where tag is null;

-- ---------------------------------------------------------------------------
-- 2. Amitiés (demande en attente puis acceptée)
-- ---------------------------------------------------------------------------
create table if not exists friendships (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx on friendships(addressee_id);
create index if not exists friendships_requester_idx on friendships(requester_id);

alter table friendships enable row level security;

drop policy if exists "friendships_read" on friendships;
create policy "friendships_read" on friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_request" on friendships;
create policy "friendships_request" on friendships
  for insert with check (auth.uid() = requester_id);

-- Seule la personne qui reçoit la demande peut l'accepter.
drop policy if exists "friendships_accept" on friendships;
create policy "friendships_accept" on friendships
  for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);

-- Chacun peut retirer/refuser l'amitié.
drop policy if exists "friendships_delete" on friendships;
create policy "friendships_delete" on friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Voir le nom/la photo d'un ami (ou de quelqu'un qui m'a envoyé une demande).
drop policy if exists "profiles_friend_read" on profiles;
create policy "profiles_friend_read" on profiles
  for select using (exists (
    select 1 from friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
       or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
  ));

-- Recherche d'une personne par Pseudo#1234, sans ouvrir la lecture de tous les
-- profils : seule cette fonction peut résoudre un identifiant public.
create or replace function public.find_profile_by_tag(p_name text, p_tag text)
returns table (id uuid, display_name text, avatar_url text)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where lower(coalesce(p.display_name, '')) = lower(trim(p_name))
    and p.tag = lpad(trim(p_tag), 4, '0')
    and p.id <> auth.uid()
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 3. Envoi d'une recette à un ami précis
-- ---------------------------------------------------------------------------
create table if not exists recipe_shares (
  id uuid primary key default uuid_generate_v4(),
  dish_id uuid not null references dishes(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (dish_id, from_user_id, to_user_id)
);

create index if not exists recipe_shares_to_idx on recipe_shares(to_user_id);

alter table recipe_shares enable row level security;

drop policy if exists "recipe_shares_read" on recipe_shares;
create policy "recipe_shares_read" on recipe_shares
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- On ne peut envoyer une recette qu'à un ami accepté, et seulement une des siennes.
drop policy if exists "recipe_shares_send" on recipe_shares;
create policy "recipe_shares_send" on recipe_shares
  for insert with check (
    auth.uid() = from_user_id
    and exists (select 1 from dishes d where d.id = dish_id and d.user_id = auth.uid())
    and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = to_user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = to_user_id))
    )
  );

drop policy if exists "recipe_shares_delete" on recipe_shares;
create policy "recipe_shares_delete" on recipe_shares
  for delete using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Le destinataire peut lire la recette reçue (lecture seule, pour la copier).
drop policy if exists "dishes_shared_with_me_read" on dishes;
create policy "dishes_shared_with_me_read" on dishes
  for select using (exists (
    select 1 from recipe_shares s where s.dish_id = dishes.id and s.to_user_id = auth.uid()
  ));

drop policy if exists "ingredients_shared_with_me_read" on ingredients;
create policy "ingredients_shared_with_me_read" on ingredients
  for select using (exists (
    select 1 from recipe_shares s where s.dish_id = ingredients.dish_id and s.to_user_id = auth.uid()
  ));

drop policy if exists "recipe_steps_shared_with_me_read" on recipe_steps;
create policy "recipe_steps_shared_with_me_read" on recipe_steps
  for select using (exists (
    select 1 from recipe_shares s where s.dish_id = recipe_steps.dish_id and s.to_user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 4. Invitation d'un ami à un repas (il voit le repas + sa liste de courses)
-- Une invitation porte sur un créneau entier (date + repas) d'un foyer, pas sur
-- un plat isolé : un repas peut contenir plusieurs plats.
-- ---------------------------------------------------------------------------
create table if not exists meal_invites (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  slot text not null,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (household_id, date, slot, to_user_id)
);

create index if not exists meal_invites_to_idx on meal_invites(to_user_id, date);

alter table meal_invites enable row level security;

drop policy if exists "meal_invites_read" on meal_invites;
create policy "meal_invites_read" on meal_invites
  for select using (household_id = my_household_id() or auth.uid() = to_user_id);

drop policy if exists "meal_invites_create" on meal_invites;
create policy "meal_invites_create" on meal_invites
  for insert with check (
    auth.uid() = from_user_id
    and household_id = my_household_id()
    and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = to_user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = to_user_id))
    )
  );

drop policy if exists "meal_invites_delete" on meal_invites;
create policy "meal_invites_delete" on meal_invites
  for delete using (household_id = my_household_id() or auth.uid() = to_user_id);

-- L'invité peut lire les plats prévus à ce repas...
drop policy if exists "planning_entries_invited_read" on planning_entries;
create policy "planning_entries_invited_read" on planning_entries
  for select using (exists (
    select 1 from meal_invites mi
    where mi.to_user_id = auth.uid()
      and mi.household_id = planning_entries.household_id
      and mi.date = planning_entries.date
      and mi.slot = planning_entries.slot
  ));

-- ...ainsi que les recettes et ingrédients de ces plats (pour la liste de courses).
drop policy if exists "dishes_meal_invite_read" on dishes;
create policy "dishes_meal_invite_read" on dishes
  for select using (exists (
    select 1 from planning_entries pe
    join meal_invites mi
      on mi.household_id = pe.household_id and mi.date = pe.date and mi.slot = pe.slot
    where pe.dish_id = dishes.id and mi.to_user_id = auth.uid()
  ));

drop policy if exists "ingredients_meal_invite_read" on ingredients;
create policy "ingredients_meal_invite_read" on ingredients
  for select using (exists (
    select 1 from planning_entries pe
    join meal_invites mi
      on mi.household_id = pe.household_id and mi.date = pe.date and mi.slot = pe.slot
    where pe.dish_id = ingredients.dish_id and mi.to_user_id = auth.uid()
  ));

drop policy if exists "recipe_steps_meal_invite_read" on recipe_steps;
create policy "recipe_steps_meal_invite_read" on recipe_steps
  for select using (exists (
    select 1 from planning_entries pe
    join meal_invites mi
      on mi.household_id = pe.household_id and mi.date = pe.date and mi.slot = pe.slot
    where pe.dish_id = recipe_steps.dish_id and mi.to_user_id = auth.uid()
  ));
