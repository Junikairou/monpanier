-- À coller dans Supabase SQL Editor > New query > Run
-- Partage de l'app entre membres d'un même foyer : planning et liste de
-- courses communs. Rejoindre un foyer se fait via un code temporaire de 5
-- minutes (Profil > Foyer). "Mes plats" reste personnel pour l'instant
-- (le partage individuel de recettes est une étape future).

-- 1. Tables foyer
create table if not exists households (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Mon foyer',
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_idx on household_members(user_id);

create table if not exists household_invites (
  code text primary key,
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 2. Colonne household_id sur les tables partagées
alter table profiles add column if not exists household_id uuid references households(id);
alter table planning_entries add column if not exists household_id uuid references households(id);
alter table grocery_items add column if not exists household_id uuid references households(id);
alter table planning_template_entries add column if not exists household_id uuid references households(id);

-- 3. Backfill : un foyer perso par compte existant
do $$
declare
  r record;
  new_id uuid;
begin
  for r in select id from profiles where household_id is null loop
    new_id := uuid_generate_v4();
    insert into households (id, name) values (new_id, 'Mon foyer');
    insert into household_members (household_id, user_id) values (new_id, r.id);
    update profiles set household_id = new_id where id = r.id;
  end loop;
end $$;

update planning_entries pe set household_id = pr.household_id
  from profiles pr where pr.id = pe.user_id and pe.household_id is null;

update grocery_items gi set household_id = pr.household_id
  from profiles pr where pr.id = gi.user_id and gi.household_id is null;

update planning_template_entries pt set household_id = pr.household_id
  from profiles pr where pr.id = pt.user_id and pt.household_id is null;

alter table profiles alter column household_id set not null;
alter table planning_entries alter column household_id set not null;
alter table grocery_items alter column household_id set not null;
alter table planning_template_entries alter column household_id set not null;

create index if not exists planning_entries_household_date_idx on planning_entries(household_id, date);
create index if not exists grocery_items_household_idx on grocery_items(household_id);
create index if not exists planning_template_entries_household_idx on planning_template_entries(household_id);

-- La coche d'un ingrédient devient partagée par foyer (et non plus par
-- personne) : remplace l'index unique (user_id, merge_key) par (household_id, merge_key).
drop index if exists grocery_items_user_merge_key_uidx;
create unique index if not exists grocery_items_household_merge_key_uidx
  on grocery_items(household_id, merge_key);

-- 4. Fonction utilitaire : foyer de l'utilisateur connecté (security definer
-- pour éviter toute récursion RLS)
create or replace function my_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from profiles where id = auth.uid();
$$;

-- 5. RLS des nouvelles tables
alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;

create policy "households_member_select" on households
  for select using (id = my_household_id());

create policy "household_members_select" on household_members
  for select using (household_id = my_household_id() or user_id = auth.uid());

create policy "household_invites_own_household" on household_invites
  for select using (household_id = my_household_id());
create policy "household_invites_create" on household_invites
  for insert with check (household_id = my_household_id());
create policy "household_invites_delete" on household_invites
  for delete using (household_id = my_household_id());

-- 6. RLS des tables partagées : remplace "propriétaire" par "membre du foyer"
drop policy if exists "planning_owner" on planning_entries;
create policy "planning_household" on planning_entries
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

drop policy if exists "grocery_owner" on grocery_items;
create policy "grocery_household" on grocery_items
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

drop policy if exists "planning_template_owner" on planning_template_entries;
create policy "planning_template_household" on planning_template_entries
  for all using (household_id = my_household_id()) with check (household_id = my_household_id());

-- 7. Rejoindre un foyer via un code temporaire (transaction atomique,
-- security definer pour pouvoir lire un code qui appartient à un autre foyer)
create or replace function join_household_with_code(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target_household uuid;
begin
  select household_id into target_household
  from household_invites
  where code = p_code and expires_at > now();

  if target_household is null then
    raise exception 'Code invalide ou expiré';
  end if;

  insert into household_members (household_id, user_id)
  values (target_household, auth.uid())
  on conflict (household_id, user_id) do nothing;

  update profiles set household_id = target_household where id = auth.uid();

  delete from household_invites where code = p_code;

  return target_household;
end;
$$;

-- 8. Génère un code de partage valable 5 minutes pour le foyer de l'appelant
create or replace function create_household_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  new_code text;
  hh uuid;
begin
  hh := my_household_id();
  loop
    new_code := upper(substr(md5(random()::text), 1, 5));
    exit when not exists (select 1 from household_invites where code = new_code);
  end loop;
  insert into household_invites (code, household_id, created_by, expires_at)
  values (new_code, hh, auth.uid(), now() + interval '5 minutes');
  return new_code;
end;
$$;

-- 9. Les nouvelles inscriptions reçoivent aussi automatiquement leur propre
-- foyer (remplace la fonction du trigger existant on_auth_user_created)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_household uuid;
begin
  new_household := uuid_generate_v4();
  insert into households (id, name) values (new_household, 'Mon foyer');
  insert into public.profiles (id, display_name, household_id)
  values (new.id, split_part(new.email, '@', 1), new_household);
  insert into household_members (household_id, user_id) values (new_household, new.id);
  return new;
end;
$$ language plpgsql security definer;
