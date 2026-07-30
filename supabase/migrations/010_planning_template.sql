-- À coller dans Supabase SQL Editor > New query > Run
-- Planning par défaut (modèle) : rempli manuellement, appliqué à la demande
-- sur une semaine du planning réel (bouton "Appliquer le modèle").
create table if not exists planning_template_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = lundi
  slot text not null check (slot in ('petit_dej','dejeuner','gouter','diner','collation')),
  dish_id uuid references dishes(id) on delete set null,
  is_restaurant boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists planning_template_entries_user_idx on planning_template_entries(user_id);

alter table planning_template_entries enable row level security;

create policy "planning_template_owner" on planning_template_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
