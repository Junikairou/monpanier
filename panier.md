# Panier — Suivi du projet Mon Panier (ex-Mijoté)

Document de référence pour reprendre ce projet dans une nouvelle conversation ou avec une autre IA. À tenir à jour à chaque changement important.

## Règles de collaboration (impératif)

- **Toujours AskUserQuestion** au moindre doute, même minime — quitte à en poser beaucoup. Mieux vaut trop demander que corriger après coup.
- **Minimiser la consommation de tokens.**
- **Être concis, clair, compréhensible, efficace** — l'utilisateur n'est pas développeur, éviter le jargon.
- **Une modification impacte tous les comptes**, sauf preuve explicite du contraire.
- **Toujours pousser sur GitHub** après une modification, sauf preuve explicite du contraire.
- **Incohérence détectée → AskUserQuestion**, ne pas deviner.
- **Suggérer une nouvelle conversation** quand c'est pertinent (conversation trop ancienne/longue), pour économiser les tokens — renvoyer vers ce fichier pour la reprise de contexte.

## Projet

- **Mon Panier** (anciennement Mijoté, renommé le 2026-07-30) — app de planning de repas (planning semaine, inventaire de plats, liste de courses, profil).
- Stack : Expo (React Native + web, Expo Router) — pensé pour devenir une app mobile native plus tard sans réécrire le code.
- Dossier local : `C:\Users\daich\Downloads\Mon Panier`
- Dépôt GitHub : **github.com/Junikairou/monpanier** (renommé depuis `mijote` le 2026-07-30, public — nécessaire pour GitHub Pages gratuit)
- App en ligne : **https://junikairou.github.io/monpanier/** (déploiement automatique à chaque push sur `master` via GitHub Actions, voir `.github/workflows/deploy-pages.yml`)
- Backend : Supabase (projet `kjltmojlewrnwimzskgj`) — auth + base de données + RLS
- Connexion : e-mail/mot de passe + Google OAuth
- Design : polices DM Sans (texte) + Playfair Display (titres), palette sage/beige/crème — voir `src/theme/tokens.ts`

## Fonctionnalités faites

- Auth : connexion/inscription e-mail (avec confirmation du mot de passe), connexion Google, questionnaire d'onboarding (taille du foyer, repas à planifier)
- Planning de la semaine : navigation semaine par semaine, ajout/changement/suppression de repas, ne montre que les repas activés dans le profil ; **un créneau peut contenir plusieurs plats** (entrée + plat + dessert...) ; total calories du jour et indicateur "repas équilibré" (règle simple : présence d'un plat + accompagnement + fruit dans la journée)
- Plats : création (ingrédients + étapes de recette), **type de plat** (entrée/plat/accompagnement/dessert/fruit/boisson/autre), **calories en saisie manuelle** (optionnel), fiche détail, ajout au planning
- Liste de courses : vue "Par catégorie" (une carte par ingrédient, indique le/les plat(s) d'origine) et vue "Par plat" (bloc compact par plat, se replie si tout est coché) — filtre Jour/Semaine avec navigation, état coché persistant (indépendant de la fenêtre affichée)
- Profil : thème clair/sombre/auto, langue (préférence enregistrée, pas de traduction complète), unités, taille du foyer, repas à planifier
- PWA installable (manifest + icônes — icône encore générique Expo, pas personnalisée)

## Pas fait / en attente

- Communauté (partage de recettes) — explicitement mis de côté dès le départ
- Traduction anglaise complète de l'interface
- Icône PWA personnalisée (branding Mijoté)
- Import de recette par IA (lien/texte/photo) — proposé puis abandonné (pas de clé API Anthropic)
- Build natif Android pour le Play Store — prévu **plus tard**, pas commencé (nécessite un compte Google Play Developer, ~25$ une fois)
- Déploiement automatique Vercel — abandonné au profit de GitHub Pages (2026-07-30)

## Points d'attention techniques

- **Migrations SQL** à exécuter manuellement dans Supabase (SQL Editor) : `supabase/schema.sql` puis `supabase/migrations/001...005` dans l'ordre. Vérifier ce qui est déjà appliqué avant d'ajouter une migration. **Migration 005 en attente d'exécution** (ajoute `course_type`/`calories` sur `dishes`, ajoute `feculents` aux rayons de courses) — à lancer dans Supabase SQL Editor.
- `.env` local jamais commité (gitignored). Secrets GitHub Actions : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (repo Settings → Secrets).
- `app.json` : `experiments.baseUrl = "/monpanier"` — nécessaire pour que les chemins fonctionnent sous `github.io/monpanier`. Ne pas retirer.
- Redirection Google OAuth : ne jamais utiliser `window.location.origin` seul (perd le `/monpanier/`) — voir la logique dans `src/lib/auth.tsx`.
- **À vérifier dans le dashboard Supabase** (Authentication → URL Configuration) après le renommage : mettre à jour les Redirect URLs si `mijote://` ou `/mijote/` y étaient enregistrés en dur (sinon Google OAuth peut casser).
- Outils installés sur la machine : `gh` (GitHub CLI, connecté), `vercel` CLI (plus utilisé mais toujours installé), Node.js, GitHub Pages CLI n/a.
- Node/npm ne sont pas dans le PATH par défaut du terminal sandboxé — toujours rafraîchir le PATH avant les commandes (`$env:Path = ...`) ou utiliser les chemins complets.

## Chantier en cours (demande du 2026-07-30, gros lot de features)

Fait par étapes, push à chaque étape terminée :
1. ✅ Structure repas multi-plats (entrée/plat/dessert/accompagnement/fruit/boisson) + calories manuelles + indicateur équilibre — **fait, migration 005 à exécuter dans Supabase**.
2. ⏳ Planning : retour à aujourd'hui, calendrier (choix mois/année), repas "au resto", mise en avant du jour actuel, vue hebdomadaire d'ensemble.
3. ⏳ Courses : icônes par catégorie, sélecteur de plage de dates (plusieurs jours) pour les utilisateurs qui font les courses tous les 2-3 jours.
4. ⏳ Thèmes rose et bleu (palettes complètes en plus de clair/sombre/auto).

## Décisions notables (avec date)

- 2026-07-30 — "Équilibre" du repas = règle simple basée sur le type de plat (présence plat + accompagnement + fruit dans la journée), pas une vraie analyse nutritionnelle par ingrédient (pas de budget API nutrition). Affiché comme indicatif, pas une recommandation médicale.
- 2026-07-30 — Renommage complet **Mijoté → Mon Panier** : repo GitHub (`mijote`→`monpanier`), slug/scheme Expo, URL Pages (`/monpanier/`), manifest PWA, textes affichés dans l'app.
- 2026-07-30 — Repo GitHub gardé **public** (choix utilisateur, nécessaire pour Pages gratuit ; aucune donnée secrète commitée).
- 2026-07-30 — Vercel abandonné au profit de GitHub Pages (l'utilisateur voulait "juste GitHub").
- 2026-07-30 — Liste de courses repensée : calcul en direct depuis planning + ingrédients à chaque affichage (pas stocké), seul l'état "coché" persiste (table `grocery_items`, colonne `merge_key`, index unique **non partiel** — un index partiel casse les `ON CONFLICT` de Supabase, piège à ne pas reproduire).
- Design actuel basé sur la maquette `mealplan-mockup (1).html` (PlatDuJour v2) fournie par l'utilisateur — à respecter à la lettre sauf instruction contraire explicite donnée depuis.

## Historique mémoire (agent)

Des notes complémentaires existent aussi dans la mémoire persistante de l'agent (hors dépôt) :
`feedback_mijote_collaboration_rules.md` et `project_mijote_app.md`. Ce fichier `panier.md` est la source la plus à jour et doit primer en cas de différence.
