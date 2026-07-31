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
- Planning : bouton retour à aujourd'hui (⟲), calendrier mois/année pour sauter à une date (📅), jour actuel mis en avant dans la frise (bordure + agrandi), repas "au resto" (créneau marqué complété sans choisir de plat, exclu de la liste de courses)
- Planning, vue "Semaine" : cartes glissantes par jour (aujourd'hui + 2 jours suivants visibles, glisser pour voir la suite), case "Cuisiné" par plat, navigation semaine précédente/suivante, "+ New" pour ajouter un plat directement dans une carte
- Indicateur "repas équilibré" calculé **par créneau** (petit-déj/déjeuner/dîner...) et non plus par jour ; désactivable dans Profil → Planning
- Plats : création (ingrédients + étapes de recette), **type de plat** (entrée/plat/accompagnement/dessert/fruit/boisson/autre), **calories en saisie manuelle** (optionnel), fiche détail, ajout au planning
- Liste de courses : vue "Par catégorie" (icône + une carte par ingrédient, indique le/les plat(s) d'origine) et vue "Par plat" (bloc compact par plat, se replie si tout est coché) — filtre Jour/Semaine/**Plage** (sélection libre de deux dates via calendrier, pour les courses tous les 2-3 jours), état coché persistant (indépendant de la fenêtre affichée), jour actuel mis en avant dans le filtre "Jour"
- Profil : thème clair/sombre/auto/**rose/bleu**, langue (préférence enregistrée, pas de traduction complète), unités, taille du foyer, repas à planifier
- PWA installable (manifest + icônes — icône encore générique Expo, pas personnalisée)

## Chantier en cours (demande du 2026-07-31, retours utilisateur)

1. ✅ Bug : "Supprimer ce plat" ne faisait rien sur le web — `Alert.alert` est un no-op sur React Native Web ; remplacé par `window.confirm` sur web, `Alert.alert` conservé sur natif.
2. ✅ Bouton retour (‹) ajouté sur la fiche recette (`ScreenHeader` a maintenant un `onBack` optionnel).
3. ✅ Liste de courses : cliquer sur un plat (vue "Par plat" ou pastille plat en "Par catégorie") ouvre sa fiche recette.
4. ✅ Liste de courses : affichage du/des jour(s) de consommation prévu par ingrédient/plat en vues Semaine et Plage (masqué en vue Jour, redondant).
5. ✅ Récurrence à l'ajout au planning — dans la fiche recette, "+ Ajouter au planning" propose maintenant une fréquence (Une fois / Tous les jours / Tous les 2 jours / Toutes les semaines / Une semaine sur deux / Personnalisé en jours) et une date de fin (calendrier). Aucune migration nécessaire (réutilise `planning_entries`). **Non testé visuellement** (pas d'identifiants) — à vérifier.
6. ✅ Infos nutritionnelles détaillées par plat — protéines/glucides/lipides/fibres en grammes, saisie manuelle optionnelle (comme les calories, pas de calcul automatique par ingrédient). Affiché sur la fiche recette et en total du jour dans le planning. **Migration 014 à exécuter** (colonnes `protein_g`/`carbs_g`/`fat_g`/`fiber_g` sur `dishes`). **Non testé visuellement** (pas d'identifiants) — à vérifier.
7. ✅ Nombre de personnes par repas planifié — chaque recette déclare "pour combien de personnes" (`base_servings`, réglable dans le formulaire du plat), chaque repas planifié a ses propres portions (`servings`, modifiable via un compteur +/– directement sur la carte du plat dans le planning, vue Jour). La liste de courses recalcule les quantités au prorata (ex. un plat pour 2 et un autre pour 1 le même soir). Copier-coller de planning et modèle par défaut conservent les portions. **Migration 015 à exécuter** (colonnes `base_servings` sur `dishes`, `servings` sur `planning_entries` et `planning_template_entries`). **Non testé visuellement** (pas d'identifiants) — à vérifier.

**Backlog du 2026-07-31 : terminé (7/7).**
8. ✅ **Partage de l'app entre membres d'un même foyer** — planning et liste de courses communs à tous les membres d'un foyer. Rejoindre se fait via un code temporaire de 5 minutes (Profil → section "Partage du foyer" : bouton pour générer un code, champ pour saisir un code reçu). "Mes plats" reste personnel à chacun pour l'instant. **Migration 012 à exécuter — lire l'avertissement ci-dessous avant.**
   - Sous-demandes explicitement **différées** (pas encore faites) : inviter quelqu'un pour un seul repas ponctuel (sans l'ajouter au foyer), et partage individuel d'un plat/recette d'une personne à une autre.
9. ✅ Modifier une recette existante — bouton "✏️ Modifier la recette" sur la fiche plat, écran dédié (`/plats/modifier`) réutilisant le même formulaire que la création. Aucune migration nécessaire. **Non testé visuellement** (pas d'identifiants) — à vérifier.
10. ✅ Icône de l'onglet "Profil" en bas → "⋯" (ellipsis-horizontal-circle), onglet renommé "Plus".
11. ✅ Catalogue de recettes prédéfinies (`/plats/catalogue`, accessible depuis Plus → section "Recettes") : liste les recettes d'exemple existantes avec un bouton "+ Ajouter" par recette (marque "✓ Ajouté" si déjà dans Mes plats). Aucune migration nécessaire. **Non testé visuellement** (pas d'identifiants) — à vérifier.
12. ✅ Section "Personnalisation" dans Plus (`/personnalisation`) : gestion des types de plat, catégories de plat et rayons (courses) — ajout, renommage, suppression, y compris des valeurs de départ. **Portée par foyer** (partagé avec les membres, décision du 2026-07-31) — pas par personne. **Migration 013 à exécuter** (tables `dish_categories`, `course_types`, `grocery_categories` + retrait des contraintes figées en base). **Non testé visuellement** (pas d'identifiants) — à vérifier.
    - Détail technique : les types `Category`/`CourseType`/`GroceryCategory` (`src/types/models.ts`) sont passés de listes figées à `string` libre ; les libellés/icônes viennent maintenant de `useTaxonomies()` (`src/lib/taxonomies.tsx`), plus des anciennes constantes `CATEGORY_LABELS` etc. (supprimées).
    - **Limite connue** : "Mes plats" restant personnel (pas partagé, cf. décision du chantier foyer), si un plat/ingrédient existant utilise une valeur supprimée, il garde l'ancien texte affiché tel quel (pas de blocage, pas de casse).

**⚠️ Migration 012 (foyers/partage) — à lire avant d'exécuter :** c'est la modification la plus lourde faite jusqu'ici sur la base (nouvelles tables + colonnes `household_id` sur `profiles`, `planning_entries`, `grocery_items`, `planning_template_entries`, remplacement des règles de sécurité RLS de ces tables, remplacement de l'index unique de la liste de courses). Chaque compte existant reçoit automatiquement son propre foyer solo (rien ne change tant que personne n'est invité). Recommandé : faire une sauvegarde Supabase (Database → Backups) avant d'exécuter cette migration. **Non testé en conditions réelles** (pas d'identifiants disponibles pour l'agent) — à tester soigneusement (idéalement avec un deuxième compte) avant de compter dessus.

Points 5, 6, 9 à 12 : restent à faire, pas de blocage particulier restant.

## Chantier en cours (demande du 2026-07-31, suite — retours après premiers tests)

1. ✅ **Bug résolu et confirmé (2026-08-01) : planning/courses "pas synchronisés"** — cause réelle trouvée grâce à un diagnostic ajouté temporairement dans l'app : la migration 015 (colonnes `servings`/`base_servings`) n'avait en fait jamais été appliquée en base malgré une confirmation précédente. `groceries.ts` demande explicitement la colonne `planning_entries.servings`, ce qui faisait échouer silencieusement le calcul de la liste de courses (Planning utilisait `select('*')`, insensible à la colonne manquante, d'où l'écart entre les deux écrans). Corrigé en réexécutant la migration 015. Au passage : le partage des plats entre membres du foyer (migration 016) reste une amélioration valide et nécessaire, mais n'était pas la cause de ce bug précis.
   - Séquelles à nettoyer si besoin : Planning et Courses affichent maintenant un message d'erreur visible en cas d'échec de chargement (au lieu de rester silencieusement vides) — changement gardé en permanence, utile pour tout futur souci similaire.
2. ✅ Bouton "retour à aujourd'hui" (⟲) ajouté dans l'en-tête de la liste de courses (comme dans Planning).
3. ✅ Réglage "Taille du texte" (Normal/Grand/Très grand) dans Plus → Apparence — **corrigé et confirmé (2026-08-01)** : la première version (patch global du module react-native) ne fonctionnait pas silencieusement (bundler bloquant la mutation). Remplacé par `src/components/ScaledText.tsx`, un composant `Text`/`TextInput` partagé que tous les écrans importent désormais à la place de 'react-native' directement — s'applique réellement à toute l'app. Vérifié techniquement (27px → 35.1px à l'échelle 1.3). Stocké localement (comme le thème).
4. ✅ Refonte de l'onglet "Plus" façon grille de vignettes par catégorie :
   - **Mon profil** → page dédiée `/profil/mon-profil` : photo de profil (upload depuis l'appareil), pseudo, e-mail (lecture seule), téléphone, changer le mot de passe (masqué si connecté par Google), "changer de compte" (= déconnexion, pas de multi-compte dans l'app), se déconnecter, réinitialiser des données. **Suppression de compte : pas fait** (nécessite une fonction serveur avec clé secrète).
   - **Préférences** : Apparence (thème, langue — français/anglais/中文, taille du texte, unités) ; Options avancées (indicateur repas équilibré, affichage calories/nutriments dans le formulaire de plat, repas à planifier).
   - **Social** : Partage du foyer (personnes dans le foyer, générer un code, rejoindre, liste des membres avec photo/pseudo) — "Foyer" fusionné directement dans cette page, plus de tuile séparée ; Amis (page d'attente).
   - **Gestion** : Recettes → Catalogue de recettes (déplacé dans l'onglet Plus lui-même pour que le bouton retour revienne bien à "Plus" et non à "Mes plats") ; Personnalisation → types/catégories/rayons.
   - **Avancé** : Paramètres, Historique, Feedback — pages d'attente.
5. ✅ Réinitialisation sélective des données (`/profil/reinitialiser`) : case à cocher par catégorie (Mes plats / Planning / Courses / Modèle par défaut / Préférences), confirmation avant suppression définitive.
6. ✅ Photo de profil : upload depuis la galerie (`expo-image-picker`), stockée dans Supabase Storage (bucket `avatars`). **Migration 016** crée le bucket et ses règles d'accès.
7. ✅ Bouton retour (‹) recentré dans son cercle sur tous les écrans (icône Ionicons au lieu du caractère "‹").
8. ✅ Filet de sécurité liste de courses : un ingrédient dont le rayon ne correspond à aucune catégorie connue du foyer s'affiche désormais sous "📦 Autres" au lieu de disparaître silencieusement.
9. ✅ Planning (vue Jour) : cliquer sur le **nom du plat** ouvre directement sa fiche recette (en plus du bouton "Voir recette") ; le nombre de personnes s'affiche en texte sur la même ligne que le nom ("2 pers.") au lieu d'un compteur +/- séparé (qui posait problème) ; bouton "🔄 Changer" retiré ; bouton "🍽️ Au resto" retiré (remplacé par la possibilité d'ajouter un plat de catégorie "Resto"/"Fastfood" via Personnalisation, comme déjà fait par l'utilisateur) ; les boutons en bas de chaque repas passent à la ligne si besoin (évite qu'ils soient coupés).
10. ✅ Fiche recette : "Jour" se choisit maintenant via un calendrier ; "Repas" ne propose que les créneaux actifs (réglés dans Options avancées) ; "Répétition" est un menu déroulant ; un réglage "portions" (👤 +/-) en haut de l'onglet Ingrédients permet de prévisualiser les quantités mises à l'échelle sans modifier la recette ; temps de préparation affiché s'il est renseigné.
11. ✅ Formulaire de plat (création/modification) : emoji à côté du nom, "Type de plat" en menu déroulant, "Rayon" et "Unité" (liste fixe : pièce/gramme/mL/cuillère à soupe/pincée) en menus déroulants pour chaque ingrédient, champ "Temps de préparation", calories/nutriments masquables via Options avancées (réglage `show_nutrition_fields`).
12. ✅ "Tous les plats" : bouton "Gérer" en haut à droite pour sélectionner plusieurs plats et les supprimer en une fois.
13. ✅ Catégories de plat par défaut modernisées pour les **nouveaux foyers** uniquement (Français/Italien/Asiatique/Rapide/Végé/Resto/Autre au lieu de Rapide/Healthy/Pâtes/Végé/Autre) — les foyers existants gèrent déjà les leurs via Personnalisation, non touchés.

**Migrations à exécuter, dans l'ordre : 011 à 017** (SQL envoyé dans le chat à chaque étape).

## Chantier en cours (2026-08-01, retours après le lot précédent)

1. ✅ **Bug résolu et confirmé** : synchronisation planning/courses — voir détail plus haut (migration 015 manquante).
2. ✅ **Taille du texte corrigée et confirmée** — voir détail plus haut (`ScaledText.tsx` au lieu du patch global qui ne marchait pas).
3. ✅ **Bug corrigé : "Enregistrer les modifications" ne faisait rien** dans Modifier le plat — le formulaire n'affichait aucune erreur si `onSubmit` échouait (échec silencieux). `DishForm` affiche maintenant le message d'erreur réel s'il y en a une.
4. ✅ Formulaire de plat : emoji en carré (au lieu d'un champ texte classique) ; ingrédient sur une seule ligne (nom, quantité en petit encadré, unité) ; unités avec majuscule (Pièce/Gramme/ML/Cuillère à soupe/Pincée) ; icônes désormais possibles aussi pour "Catégories de plat" et "Types de plat" (pas seulement les rayons), affichées dans les puces et menus.
5. ✅ Personnalisation : réordonnancement des vignettes par flèches ▲▼ (haut/bas), persistant (`position` en base).
6. ✅ Planning (vue Jour) : bouton "Voir recette" retiré (le nom du plat suffit) ; les portions modifiées **depuis la fiche recette ouverte depuis un repas planifié** se répercutent sur ce repas précis (pas sur la recette elle-même — un aperçu générique reste possible en ouvrant la recette autrement) ; boutons "+ Ajouter un autre plat" / "+ Planifier un plat" unifiés en un seul "+ Ajouter un plat" en bas de chaque repas ; présentation des cartes uniformisée (même style qu'il y ait un plat ou non).
7. ✅ "Tous les plats" : bouton "Tout sélectionner" dans le mode Gérer (la suppression des plats du catalogue de démonstration fonctionnait déjà, aucune restriction n'existait).
8. ✅ Catalogue de recettes : sélection multiple (cases à cocher) + ajout groupé en une fois.
9. ✅ Partage du foyer : rôle **chef de foyer** (la première personne du foyer, ou celle arrivée en premier pour les foyers existants) / **membre**. Seul le chef peut retirer un membre (bouton ✕ visible seulement pour lui) ; la personne retirée récupère automatiquement son propre foyer solo (comme à l'inscription), aucune perte de données. **Migration 018 à exécuter.**

## Chantier en cours (2026-08-01, suite)

1. ✅ **Bug corrigé : navigation "retour" cassée** — `plats/[id].tsx` (fiche recette), `plats/modifier.tsx` et le catalogue vivaient dans le dossier de l'onglet "Plats"/"Plus". Y accéder depuis un AUTRE onglet (Planning, Courses) faisait basculer sur cet onglet, donc "retour" ramenait vers "Mes plats" au lieu de l'écran de départ. Déplacés à la racine (`app/plat/[id].tsx`, `app/plat/modifier.tsx`, `app/catalogue.tsx`), indépendants des onglets — le retour ramène maintenant toujours au bon endroit, peu importe d'où on vient.
2. ✅ Planning : le nombre de personnes ("N pers.") est repositionné à droite du nom du plat, juste avant le bouton ✕ (au lieu d'être collé au nom).
3. ✅ Semaine du planning : glisser avec la souris fonctionne maintenant aussi sur ordinateur (avant : seulement au doigt sur mobile).
4. ✅ "Tous les plats" : bouton "+ Nouveau" déplacé en bas (bouton flottant), ouvre maintenant un choix "Piocher dans le catalogue" / "Créer une nouvelle recette" au lieu d'aller direct sur le formulaire vierge.
5. ✅ Liste de courses : badges réordonnés (nom du plat affiché avant le jour de consommation, au lieu de l'inverse).
6. ✅ Personnalisation : réordonnancement par glisser-déposer (maintenir l'icône ☰ et glisser), remplace les flèches ▲▼.
7. ✅ Sélecteur d'emoji visuel (grille d'emojis courants + champ pour en coller un autre) au lieu d'ouvrir le clavier du système — utilisé pour l'emoji d'un plat et les icônes de catégories/types/rayons dans Personnalisation.

**Migration 018 à exécuter** (rôles chef/membre — si pas déjà fait). Aucune nouvelle migration pour ce lot.

**Migration 018 à exécuter** (rôles chef/membre du foyer, voir SQL dans le chat).

## Chantier en cours (2026-08-01, retours utilisateur — gros lot v2)

Lot 1 (terminé, cette conversation) :
1. ✅ Message vide ("Aucun plat dans cette catégorie…") : `EmptyState` (`src/components/ui.tsx`) a maintenant une marge horizontale (24px) + texte centré — corrige ce message partout où il est utilisé (sélecteur de plat, Mes plats, Courses), règle valable pour toutes les futures maj.
2. ✅ Sélecteur de plat (`app/choisir-plat.tsx`), catégorie vide : bouton "+ Créer un nouveau plat" ouvre directement la création (`plats/new`) et ajoute le plat créé au créneau visé automatiquement au lieu de renvoyer vers l'onglet Plats.
3. ✅ Onglet "Plus" : revenir dessus (depuis un autre onglet) réaffiche toujours sa page principale, même si une sous-page était ouverte (reset de la pile de navigation au tap sur l'onglet).
4. ✅ Options avancées : déjà activées par défaut pour tout nouveau compte/foyer (vérifié en base — `show_balance_hint`, `show_nutrition_fields`, tous les créneaux repas). Rien à changer.
5. ✅ Logo (i) ajouté à côté des boutons ⟲/📅/🛒 du planning, ⟲ des courses, et du bloc Jour/Semaine/Plage — explique ce que fait chaque bouton. Règle à appliquer aussi pour toutes les futures maj de boutons peu explicites.

**Non testé visuellement** (pas d'identifiants) — l'app compile et l'écran de connexion s'affiche sans erreur (vérifié), mais le comportement exact (ajout au planning depuis "+Créer un nouveau plat", reset de l'onglet Plus) reste à vérifier par l'utilisateur.

Backlog (lot 2, prochaine conversation) :
6. ⬜ Ajouter un repas directement dans le planning sans passer par "Options avancées".
7. ⬜ Possibilité d'ajouter des repas à planifier en plus des créneaux existants (petit-déj/déjeuner/dîner...).
8. ⬜ Confirmation avant de quitter une page avec modifications non enregistrées (création/modif de plat + autres endroits de validation) — dans le thème visuel de l'app.
9. ⬜ Suggestion automatique du rayon à l'ajout d'un ingrédient (dictionnaire de mots-clés), modifiable par l'utilisateur, "Autre" si incertain.
10. ⬜ Animations de transition pour toutes les actions — règle à appliquer aussi pour toutes les futures maj.
11. ⬜ Accélérer la saisie d'une étape de recette dans "Nouveau plat" (éviter de taper à la main de A à Z).
12. ⬜ Choix Mode Complet / Mode Simple à la première connexion (options avancées activées ou désactivées par défaut) avec explication brève des deux modes.
13. ⬜ Petit tutoriel des onglets (flèche + texte explicatif par onglet) avec case "Ne plus rappeler" par fenêtre, si les onglets restent sans info.

## Pas fait / en attente

- Communauté (partage de recettes) — explicitement mis de côté dès le départ
- Traduction anglaise complète de l'interface
- Icône PWA personnalisée (branding Mijoté)
- Import de recette par IA (lien/texte/photo) — proposé puis abandonné (pas de clé API Anthropic)
- Build natif Android pour le Play Store — prévu **plus tard**, pas commencé (nécessite un compte Google Play Developer, ~25$ une fois)
- Déploiement automatique Vercel — abandonné au profit de GitHub Pages (2026-07-30)

## Points d'attention techniques

- **Migrations SQL** à exécuter manuellement dans Supabase (SQL Editor) : `supabase/schema.sql` puis `supabase/migrations/001...017` dans l'ordre. Vérifier ce qui est déjà appliqué avant d'ajouter une migration. **Migrations 016 et 017 en attente d'exécution** (016 : corrige le bug de synchronisation planning/courses + photo de profil + visibilité des profils du foyer ; 017 : temps de préparation, affichage nutrition désactivable, nouvelles catégories par défaut). Migrations 009 à 015 déjà exécutées (2026-07-31).
- `.env` local jamais commité (gitignored). Secrets GitHub Actions : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (repo Settings → Secrets).
- `app.json` : `experiments.baseUrl = "/monpanier"` — nécessaire pour que les chemins fonctionnent sous `github.io/monpanier`. Ne pas retirer.
- Redirection Google OAuth : ne jamais utiliser `window.location.origin` seul (perd le `/monpanier/`) — voir la logique dans `src/lib/auth.tsx`.
- Le thème (clair/sombre/auto/rose/bleu) **et la taille du texte** sont stockés **localement sur l'appareil uniquement** (AsyncStorage) — la colonne `profiles.theme_preference` en base existe mais n'est pas lue/écrite par l'app (pas de synchro multi-appareil pour l'instant).
- Photo de profil : bucket Supabase Storage `avatars` (public en lecture), créé par la migration 016 — un fichier par utilisateur (`<user_id>/avatar.<ext>`), écrasé à chaque nouvel upload.
- **À vérifier dans le dashboard Supabase** (Authentication → URL Configuration) après le renommage : mettre à jour les Redirect URLs si `mijote://` ou `/mijote/` y étaient enregistrés en dur (sinon Google OAuth peut casser).
- Outils installés sur la machine : `gh` (GitHub CLI, connecté), `vercel` CLI (plus utilisé mais toujours installé), Node.js, GitHub Pages CLI n/a.
- Node/npm ne sont pas dans le PATH par défaut du terminal sandboxé — toujours rafraîchir le PATH avant les commandes (`$env:Path = ...`) ou utiliser les chemins complets.

## Chantier terminé (demande du 2026-07-30, gros lot de features)

1. ✅ Structure repas multi-plats + calories manuelles + indicateur équilibre — migration 005 exécutée.
2. ✅ Planning : retour à aujourd'hui, calendrier, repas "au resto", mise en avant du jour actuel, vue hebdomadaire d'ensemble — migration 006 exécutée.
3. ✅ Courses : icônes par catégorie, sélecteur de plage de dates — aucune migration nécessaire.
4. ✅ Thèmes rose et bleu — migration 007 exécutée (sans effet fonctionnel, cf. plus bas).

## Chantier en cours (demande du 2026-07-30 v2, 2e gros lot)

Fait par étapes, push à chaque étape terminée :
1. ✅ Petites retouches : indicateur équilibre par créneau (pas par jour) + désactivable dans Profil, jour actuel mis en avant dans Courses — fait, migration 008 exécutée.
2. ✅ Refonte planning en cartes glissantes façon capture d'écran fournie (remplace la vue "Semaine" grille) — fait, **migration 009 à exécuter**.
3. ✅ Copier-coller un planning (jour ou semaine) — appui long sur un jour (chip ou en-tête de colonne) ou sur le libellé "Semaine du..." ouvre un menu Copier/Coller ; si la cible a déjà des repas, demande Remplacer/Ajouter à chaque fois. Aucune migration nécessaire. **Non testé visuellement** (pas d'identifiants de connexion disponibles pour l'agent) — à vérifier par l'utilisateur.
4. ✅ Planning par défaut (modèle) : menu semaine (appui long sur "Semaine du...") → "Enregistrer comme modèle" (copie la semaine affichée), "Appliquer le modèle" (sur demande, conflit → Remplacer/Ajouter), "Modifier le modèle" (écran dédié `/modele-semaine`, 7 jours génériques sans dates). **Migration 010 à exécuter** (table `planning_template_entries`). **Non testé visuellement** (pas d'identifiants) — à vérifier par l'utilisateur.
5. ✅ Profil : champ téléphone (info seulement, `profiles.phone`) + bouton "Réinitialiser le mot de passe" (envoie le lien Supabase standard à l'e-mail du compte). **Migration 011 à exécuter** (ajoute `phone` sur `profiles`). **Non testé visuellement** (pas d'identifiants) — à vérifier par l'utilisateur.

**Chantier terminé (demande du 2026-07-30 v2).**

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
