-- À coller dans Supabase SQL Editor > New query > Run
alter table profiles
  add column if not exists active_slots text[] not null default array['petit_dej','dejeuner','gouter','diner','collation'],
  add column if not exists onboarded boolean not null default false;

-- Les comptes déjà créés avant cette migration sont considérés comme déjà "onboardés"
-- pour ne pas leur imposer le questionnaire rétroactivement.
update profiles set onboarded = true where updated_at < now();
