-- À coller dans Supabase SQL Editor > New query > Run
-- Élargit la contrainte de profiles.theme_preference pour accepter "rose" et
-- "bleu" (nouveaux thèmes). Note : ce champ n'est pas encore lu/écrit par
-- l'app (la préférence de thème est stockée localement sur l'appareil) ;
-- migration faite par cohérence si ce champ est branché plus tard.
alter table profiles drop constraint if exists profiles_theme_preference_check;
alter table profiles add constraint profiles_theme_preference_check
  check (theme_preference in ('light','dark','auto','rose','bleu'));
