-- À coller dans Supabase SQL Editor > New query > Run
-- Table pour la page "Plus > Avancé > Feedback" : chacun peut envoyer un
-- message et revoir ses propres envois précédents.
create table if not exists feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy "feedback_own_insert" on feedback
  for insert with check (auth.uid() = user_id);

create policy "feedback_own_read" on feedback
  for select using (auth.uid() = user_id);
