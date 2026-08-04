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

## Chantier en cours (2026-08-01, retours après le lot 1)

1. ✅ Pull-to-refresh (glisser du doigt vers le bas) sur Planning (vue Jour), Courses et "Tous les plats".
2. ✅ Info-bulles (i) retirées — remplacées par un **appui long** directement sur les boutons concernés (⟲, 🛒 en Planning ; ⟲ et "Plage" en Courses), même contenu explicatif qu'avant.
3. ✅ Bouton 🔄 (recharger) retiré de la liste de courses (redondant avec le pull-to-refresh).
4. ✅ Bouton calendrier (📅) retiré du planning (vue Jour) : cliquer sur **n'importe quel jour** de la frise ouvre maintenant directement le calendrier (en plus de sélectionner ce jour).
5. ✅ Sélecteur de plat (`choisir-plat`) : bouton "+ Créer un nouveau plat" toujours visible (plus seulement quand la catégorie est vide), quelle que soit la catégorie filtrée — la nouvelle recette est créée pré-remplie avec cette catégorie.
6. ✅ Bouton retour (‹) ajouté sur l'écran du sélecteur de plat, pour annuler et revenir en arrière.

**Non testé visuellement** (pas d'identifiants) — compilation et écran de connexion vérifiés sans erreur. Point d'attention à confirmer par l'utilisateur : cliquer sur un jour de la frise ouvre désormais le calendrier systématiquement (au lieu de juste changer de jour) — à valider que ce comportement convient à l'usage.

## Chantier en cours (2026-08-01, lot 2)

1. ✅ **Repas à planifier personnalisables** (comme les catégories de plat) — nouvelle taxonomie `meal_slot` par foyer (table `meal_slots`), gérable depuis Plus > Personnalisation (nouvel onglet "Repas à planifier") : créer/renommer/réordonner/supprimer des créneaux de repas au-delà des 5 actuels (petit-déj/déjeuner/goûter/dîner/collation). Remplace les listes figées `MEAL_SLOT_ORDER`/`MEAL_SLOT_LABELS` partout dans le code (planning, courses, fiche recette, modèle de semaine, onboarding, options avancées, réinitialisation). **Migration 019 à exécuter** (SQL envoyé dans le chat).
2. ✅ Raccourci dans le Planning (vue Jour) pour gérer les repas actifs sans passer par Options avancées : bouton "✕ Retirer" sur chaque repas actif (si plus d'un actif) et bouton "+ Activer un repas" en bas de la liste qui propose les repas inactifs.

**Migration 019 exécutée (2026-08-01).**

**⚠️ Migration 019 — à lire avant d'exécuter :** redéfinit la fonction `handle_new_user` (comme la migration 013) pour ajouter la création des créneaux de repas par défaut à l'inscription ; reprend la version de la migration 018 (rôles chef/membre) en y ajoutant `meal_slots`. Chaque foyer existant reçoit automatiquement les 5 créneaux actuels. **Non testé en conditions réelles** (pas d'identifiants) — à tester soigneusement avant de compter dessus, idéalement en vérifiant qu'un nouveau compte reçoit bien ses 5 créneaux et que Personnalisation > Repas à planifier fonctionne (créer/renommer/supprimer).

3. ✅ Suggestion automatique de rayon à la saisie du nom d'un ingrédient (dictionnaire de mots-clés français courants), seulement si le rayon est encore sur "Autre" (ne remplace jamais un choix déjà fait par l'utilisateur) ; reste modifiable manuellement.
4. ✅ Saisie rapide d'étape de recette : rangée de suggestions ("Préchauffer le four à 180°C", "Faire revenir à feu moyen pendant 5 minutes"...) au-dessus des étapes — appuyer dessus ajoute l'étape déjà pré-remplie à ajuster, au lieu de tout taper.
5. ✅ Confirmation avant de quitter sans enregistrer sur Nouveau plat / Modifier le plat (modifications non enregistrées détectées automatiquement) — bouton retour, geste retour et navigation clavier/système interceptés, message dans le thème de l'app (pas d'alerte native).
6. ✅ Choix Mode Complet / Mode Simple à la première connexion (onboarding) — Complet : toutes options avancées + tous les repas activés (défaut) ; Simple : options avancées désactivées + seulement déjeuner/dîner. Modifiable ensuite dans Options avancées.

7. ✅ Animations de transition : navigation entre écrans (Stack, y compris les sous-pages de "Plus") en glissement animé au lieu d'un changement instantané ; retour effet visuel (léger zoom + estompage) sur Pill/Chip/MiniButton à l'appui. Règle à appliquer aussi pour toutes les futures maj (composants partagés `ui.tsx` déjà couverts, donc hérité automatiquement par les nouveaux écrans qui les utilisent).
8. ✅ Petit tutoriel des onglets (`src/components/TabsIntro.tsx`) : bulle avec flèche pointant vers l'onglet concerné, un texte par onglet (Planning/Courses/Plats/Plus), bouton Suivant/​"C'est compris", case "Ne plus me montrer ça" (persistante). Affiché automatiquement à la première visite des onglets tant que la case n'a pas été cochée. **Position de la flèche approximative** (calculée sur la largeur de la barre d'onglets divisée en 4, pas une mesure pixel-exacte du bouton réel) — à vérifier visuellement, ajuster si décalée.

**Lot 2 terminé (8/8).** **Non testé visuellement** (pas d'identifiants) — compilation vérifiée sans erreur à chaque étape.

**Backlog lot 2 : vide** — les points 6 à 13 prévus ici ont tous été livrés dans le lot 2 ci-dessus (repas personnalisables, confirmation avant de quitter, suggestion de rayon, animations, saisie rapide d'étape, mode Complet/Simple, tutoriel des onglets). Rien en attente.

## Chantier en cours (2026-08-01, lot 3)

1. ✅ Bug 404 au rafraîchissement d'une page (ex. `/planning`) sur GitHub Pages — ajout d'une copie `dist/index.html` → `dist/404.html` dans le déploiement (`.github/workflows/deploy-pages.yml`), technique standard pour les sites à une page hébergés sur GitHub Pages.
2. ✅ Planning (vue Jour) : alignement du "N pers." avec le nom du plat corrigé pour le 2e plat (et suivants) d'un créneau — la marge sous le nom du plat cassait le centrage vertical de la ligne.
3. ✅ Planning : le calendrier s'ouvre désormais en appuyant sur le texte "Aujourd'hui — [date]" sous la frise, au lieu d'un appui sur un jour de la frise (qui ne fait plus que sélectionner ce jour).
4. ✅ Liste de courses (vues Semaine/Plage, "Par catégorie") : réorganisation des badges par ligne d'article — nom(s) du/des plat(s) d'origine sur une ligne avec la quantité, jour(s) de consommation sur une ligne séparée en dessous, format "Sam 1 août" (jour, numéro, mois). Si un article vient de plusieurs plats, badge "🔗 dans N plats" repliable (▾/▴) — les noms de plats ne s'affichent qu'après un appui dessus, au lieu de tout afficher en permanence.
5. ✅ Personnalisation : onglet "Repas à planifier" remis en premier.
6. ✅ Catalogue d'articles courants par foyer (`ingredients_catalog`, **migration 020 à exécuter**) — pré-rempli avec ~45 articles français courants classés par rayon. Dans le formulaire de plat, un bouton 🔍 à côté du champ "Nom" d'un ingrédient ouvre une recherche/sélection groupée par rayon ; sélectionner un article remplit automatiquement son rayon (il ne reste qu'à indiquer Qté/Unité). Taper un nom inédit reste possible (saisie libre) : il est alors automatiquement ajouté au catalogue du foyer à l'enregistrement du plat, pour réapparaître dans les suggestions la fois suivante. **Limite connue** : pas encore d'écran dédié pour renommer/supprimer des articles du catalogue directement (seulement ajout via cette recherche/saisie) — à ajouter plus tard si besoin.
7. ✅ "Tous les plats", mode Gérer : bouton "Ranger dans..." pour reclasser en masse les plats sélectionnés dans une catégorie ou un type de plat en un clic (comme les déplacer dans un dossier), en plus de la suppression en masse existante.
8. ✅ Alignement Nom/Qté/Unité des lignes d'ingrédients (formulaire de plat) corrigé — le libellé "Unité" n'utilisait pas le même style que les libellés "Nom"/"Qté", causant un léger décalage vertical entre les champs d'une même ligne.
9. ✅ Catalogue de recettes : bouton "+ Créer" ajouté dans l'en-tête pour créer une recette directement depuis cet écran, sans devoir en sélectionner une existante.

**Migration 020 à exécuter** (catalogue d'articles par foyer, SQL envoyé dans le chat). **Non testé visuellement** (pas d'identifiants) — compilation vérifiée sans erreur, écran de connexion s'affiche.

## Chantier en cours (2026-08-01, lot 4 — retours après lot 3)

1. ✅ **Bug corrigé (mobile) : création de plat en doublon / mauvaise navigation** — deux causes cumulées : (a) le formulaire restait marqué "modifié" pendant la navigation de retour après enregistrement, ce qui faisait intercepter ce retour par le garde-fou "quitter sans enregistrer" (surtout visible sur mobile où appui tactile + retour arrivent plus vite que le re-rendu) ; (b) un double-appui tactile pouvait déclencher l'enregistrement deux fois avant que le bouton soit désactivé. Corrigé : le formulaire n'est plus marqué "modifié" avant de naviguer, et un verrou empêche tout double-enregistrement.
2. ✅ Planning : espace agrandi entre la frise des jours et la liste des repas.
3. ✅ Planning : trait en pointillé ajouté au-dessus de "+ Ajouter un plat" (même style que celui déjà entre plusieurs plats d'un même repas).
4. ✅ Liste de courses (vues Semaine/Plage) : nouvelle disposition des vignettes — nom du plat d'origine en haut à droite (même ligne que le nom de l'article), jour de consommation en bas à droite (même ligne que la quantité).
5. ✅ Options avancées : section "Repas à planifier" retirée (redondante avec le raccourci déjà présent directement dans le Planning et avec Personnalisation).
6. ✅ Formulaire de plat : "Temps de préparation" et "Prévu pour combien de personnes" sur la même ligne (moitié chacun).
7. ✅ Détection de doublon de recette : avertissement (non bloquant) sous le nom du plat si une autre recette du foyer porte déjà ce nom.
8. ✅ Sélecteur de plat (planning) : bouton "📖 Piocher dans le catalogue" ajouté à côté de "+ Créer un nouveau plat".

## Chantier en cours (2026-08-01, lot 5 — chantiers lourds)

1. ✅ **Rafraîchir en glissant vers le bas, sur web/PWA** — react-native-web n'a pas de geste natif ; recréé à la main (`src/components/PullToRefresh.tsx`, événements tactiles bruts, actif seulement quand la liste est déjà tout en haut), branché sur Planning (vue Jour), Courses et "Tous les plats". Ne change rien sur natif (RefreshControl déjà en place). **À tester au doigt sur téléphone** — non vérifiable depuis l'agent (pas d'écran tactile).
2. ✅ **Catalogue de recettes communautaire** (décision du 2026-08-01) — un plat peut être marqué "🌍 Partager au catalogue commun" depuis sa fiche (par son auteur uniquement) ; devient alors visible en lecture seule par tous les foyers dans Catalogue de recettes (nouvelle section "Partagées par la communauté", séparée des exemples fixes). "+ Ajouter" copie la recette complète (ingrédients + étapes) dans son propre foyer. **Migration 021 à exécuter** (colonne `dishes.is_public` + règles de sécurité de lecture cross-foyer sur `dishes`/`ingredients`/`recipe_steps`).
3. ✅ **Refonte des articles/ingrédients** (décision du 2026-08-01) :
   - Le catalogue d'articles porte maintenant aussi des nutriments optionnels (calories/protéines/glucides/lipides/fibres, pour 100 g), en plus du rayon. **Migration 021** ajoute ces colonnes sur `ingredients_catalog`.
   - Dans le formulaire de plat, la ligne d'un ingrédient ne montre plus que Nom/Qté/Unité (le Rayon a été retiré de la recette, il vit désormais uniquement sur l'article) ; un bouton ✏️ à côté du nom ouvre une fenêtre pour modifier l'article correspondant (nom, rayon, nutriments) ou en créer un nouveau à la volée si l'ingrédient tapé n'existe pas encore dans le catalogue.
   - Nouvel écran **"Liste d'articles"** (Plus → Gestion → Articles) : recherche, regroupement par rayon, modification et suppression de chaque article, "+ Nouvel article".
4. ✅ Étapes de la recette : réordonnancement par glisser-déposer (maintenir l'icône ☰ et glisser), même mécanisme que Personnalisation.

## Chantier en cours (2026-08-01, retours après lot 5)

1. ✅ **Bug (mobile) : création de plat en doublon / mauvaise navigation, tentative 2** — cause supplémentaire trouvée : deux `router.back()` appelés l'un après l'autre pouvaient se désynchroniser de la pile de navigation réelle sur mobile (l'écran "choisir un plat" est un modal). Remplacés par un seul `router.dismiss(2)` (API officielle expo-router pour fermer plusieurs écrans d'un coup, atomique). Au passage : la liste du planning ignore désormais les repas "fantômes" (sans plat ni marquage restaurant, résidu de ce bug) au lieu de les compter dans les pointillés entre plats — ce qui causait un pointillé qui semblait apparaître avant le 1er plat au lieu d'entre les plats. **À confirmer sur téléphone** après ce correctif.
2. ✅ Planning : légende "Aujourd'hui — [date]" recentrée (espace identique au-dessus et en dessous).
3. ✅ Flèches ‹› (planning et courses) recentrées dans leur cercle — remplacées par des icônes Ionicons (même correctif déjà appliqué au bouton retour), le caractère texte n'était pas bien centré selon les polices.
4. ✅ Bouton "revenir à aujourd'hui" (⟲) déplacé : retiré de l'en-tête (toujours visible avant), affiché seulement quand on n'est pas sur la semaine/le jour actuel, juste à côté du libellé de la semaine ou de la date — sur Planning (vues Jour et Semaine) et Courses (vue Semaine).
5. ✅ Correction du centrage : le bouton ⟲ (point 4) décalait tout le bloc "‹ Semaine du... ›" vers la gauche puisqu'il s'ajoutait dans la même ligne centrée. Découpé en 3 colonnes (gauche vide / bloc semaine-et-flèches toujours centré / ⟲ à droite) sur Planning (Jour et Semaine) et Courses (Semaine) — le libellé et ses flèches restent maintenant parfaitement centrés, que le bouton ⟲ soit affiché ou non.
6. ✅ 10 recettes courantes ajoutées au catalogue d'exemples (Lasagnes bolognaise, Ramen maison, Hachis parmentier au bœuf, Hachis parmentier végétal aux lentilles, Salade de pâtes, Salade de fruits, Poulet rôti et pommes de terre, Omelette aux champignons, Chili con carne, Riz cantonais).

## Chantier en cours (2026-08-01, connexion cassée pour d'autres personnes en PWA)

Objectif de l'utilisateur : permettre à d'autres personnes d'utiliser l'app en PWA. Deux problèmes signalés : connexion e-mail/mot de passe affiche "{}" ; connexion Google renvoie à la page de connexion sans se connecter.

1. ✅ **Partiel** — `src/lib/auth.tsx` : les erreurs de connexion (e-mail/mot de passe, Google, inscription, réinitialisation) sont maintenant capturées même en cas d'échec réseau (elles pouvaient auparavant remonter un message vide ou peu clair, d'où le "{}" observé) — affiche désormais un message clair ("Connexion impossible : le serveur n'a pas répondu"). **Ça n'explique pas forcément la cause racine** — à confirmer : si "{}" réapparaît, il faudra le message exact affiché maintenant pour continuer le diagnostic.
2. ⚠️ **Action requise dans le dashboard Supabase (je n'y ai pas accès)** — la connexion Google qui "revient à la page de connexion" est très probablement due aux **Redirect URLs** de Supabase (Authentication → URL Configuration) qui n'ont jamais été mises à jour depuis le renommage Mijoté→Mon Panier (2026-07-30, TODO jamais confirmé) : si `mijote://` ou une ancienne URL y traîne encore au lieu de `https://junikairou.github.io/monpanier/`, Google OAuth échoue silencieusement et Supabase renvoie vers l'app sans session. **À vérifier et corriger toi-même** : Supabase Dashboard → Authentication → URL Configuration → s'assurer que "Site URL" = `https://junikairou.github.io/monpanier/` et que cette même URL (avec le `/`) figure dans "Redirect URLs".

**Non testé visuellement** (pas d'identifiants) — compilation vérifiée sans erreur.

**Migration 021 à exécuter** (SQL envoyé dans le chat). **Non testé visuellement** (pas d'identifiants) — compilation vérifiée sans erreur.

⚠️ Limite connue sur le catalogue communautaire : pas de modération/signalement pour l'instant — n'importe quel membre d'un foyer peut rendre une recette publique, visible par tous les foyers de l'app.

## Chantier en cours (2026-08-01, retours utilisateur — gros lot v3)

**Planning**
1. ✅ Barre de recherche dans le sélecteur de plat (planning → "Ajouter un plat") — cherche dans le nom du plat, la catégorie, le type de plat, et comprend "30 min" (filtre par temps de préparation).
2. ✅ Répétition "tous les jours" (et autres fréquences) : ne bloque plus si le plat est déjà présent au jour de départ — la ligne du jour déjà occupé est simplement ignorée au lieu de faire échouer toute la série (`upsert ... ignoreDuplicates`). Auparavant l'insert échouait silencieusement (aucune erreur affichée) à cause d'une contrainte unique en base, d'où l'impossibilité de confirmer.
3. ✅ Texte "Jour" → "À partir du jour" quand une répétition (autre que "Une fois") est choisie.
4. ✅ Après confirmation d'un ajout au planning, retour automatique sur l'onglet Planning.
5. ✅ Temps de préparation affiché dans le planning (à côté des calories) et dans le sélecteur de plat.
6. ⬜ **Non fait — reporté** : options de notification (heure du repas, rappel du temps de préparation). Tu hésitais toi-même sur cette demande ; dis-moi si tu la veux et on la cadre à part (implique des permissions de notification, un réglage horaire par repas, etc.).

**Formulaire de plat (créer/modifier)** — refonte assez large :
7. ✅ Confirmation avant de quitter sans enregistrer : déjà en place depuis un lot précédent : à confirmer si la perte de données persiste malgré ça (dis-moi précisément dans quel cas ça t'est arrivé si ça se reproduit).
8. ✅ Sélection d'un article (ingrédient) : le rayon n'est plus une liste toujours ouverte — nouvelle navigation par rayons fermés (comme un menu), avec la recherche toujours disponible en haut pour aller plus vite.
9. ✅ "Prévu pour combien de pers. ?" → "Pour combien de personnes ?"
10. ✅ Lignes d'ingrédients bien plus compactes (une seule ligne par ingrédient au lieu d'un gros bloc), Nom agrandi, Qté et Unité réduits.
11. ✅ Unités affichées en acronyme une fois choisies (càs, càc, ml, g, kg, L, boîte, tranche, gousse, sachet, pièce, pincée) — le menu de choix garde les noms complets pour rester clair.
12. ✅ Glisser-déposer pour réordonner les ingrédients (comme les étapes).
13. ✅ Étapes de la recette compactées (numéro en pastille + champ réduit au lieu d'un gros bloc par étape).
14. ✅ Dans "Choisir un article" : bouton permanent "+ Créer un article" en bas (ouvre directement la fiche de création, sans devoir taper un nom introuvable au préalable).
15. ✅ Carré emoji réduit pour se rapprocher de la hauteur du champ "Nom du plat".
16. ✅ Catégories et suggestions d'étapes : glisser à la souris pour faire défiler sur PC (comme déjà fait pour la semaine du planning).
17. ✅ Suppression d'un ingrédient possible (bouton ✕), avec confirmation avant de le retirer.

**Liste de courses**
18. ✅ Téléchargement en JPEG (bouton 📸) — capture la liste affichée et la télécharge comme image, en plus d'être consultable/imprimable depuis le navigateur. Web uniquement (comme presque tout le reste de l'app).
19. ✅ Marge ajoutée sous "Semaine du..."/la plage de dates avant le début des articles (vues Semaine et Plage).
20. ✅ Quantités arrondies intelligemment selon l'unité : les unités "à la pièce" (pièce, boîte, tranche, gousse, sachet, càs, càc, pincée) s'arrondissent au quart le plus proche et s'affichent en fraction (¼, ½, ¾) plutôt qu'en décimales bizarres ; les unités de poids/volume (g, ml, kg, L) s'arrondissent à l'entier.
21. ⬜ **Reporté, gros chantier à part** — mode hors ligne complet (lecture ET écriture sans connexion, avec synchronisation au retour du réseau). Tu as choisi cette option la plus ambitieuse ; c'est trop risqué à greffer dans ce lot déjà énorme sans le cadrer et le tester proprement à part (service worker, stockage local de toutes les données, gestion des conflits de synchro). **On le fait dans une prochaine conversation dédiée.**

**Tous les plats**
22. ✅ Barre de recherche (nom du plat ou d'un ingrédient qu'il contient).

**Liste d'articles**
23. ✅ Menu déroulant pour filtrer par rayon (en plus de la recherche).

**Catalogue de recettes**
24. ✅ Filtres par catégorie de plat (comme "Tous les plats").
25. ✅ Barre de recherche (nom du plat ou d'un ingrédient, y compris pour les exemples).
26. ✅ Bouton "+ Créer" : normalement corrigé par le changement générique du garde-fou "quitter sans enregistrer" (voir plus haut, confirme si retour sur Catalogue fonctionne maintenant).
27. ✅ Depuis "Tous les plats" → mode Gérer : bouton "🌍 Publier au catalogue" pour rendre plusieurs recettes publiques en une fois (utilise le partage communautaire du lot précédent).
28. ✅ Prévisualisation avant d'ajouter : les recettes de la communauté ouvrent la fiche recette complète ; les exemples ouvrent une fenêtre d'aperçu (ingrédients + étapes) avec un bouton "+ Ajouter à Mes plats" directement dedans.
29. ✅ Nom du créateur affiché ("par ...") sur les recettes communautaires, dans le catalogue et sur la fiche recette.

**Migrations à exécuter, dans l'ordre : 020, 021, puis 022** (022 : autorise à lire le nom de l'auteur d'une recette publique, nécessaire pour le point 29). SQL envoyé dans le chat.

**Non testé visuellement** (pas d'identifiants) — compilation vérifiée sans erreur à chaque étape.

## Chantier en cours (2026-08-02, retours détaillés — bugs + planning historique)

1. ✅ **Bug trouvé et corrigé : chevauchement visuel** — dans le sélecteur de plat (planning) et le catalogue, la liste de résultats n'avait pas `style={{flex:1}}` explicite, ce qui pouvait la faire déborder par-dessus les catégories/boutons juste au-dessus quand elle contenait beaucoup d'éléments (react-native-web a besoin de cette contrainte explicite pour borner correctement le défilement). Corrigé partout où le même schéma existait (planning, courses, tous les plats, catalogue, articles), en prévention.
2. ✅ **Bug corrigé (vraie cause cette fois) : "Quitter sans enregistrer" ne faisait rien** — le bouton retour de l'écran appelait `router.back()` directement, ce qui déclenchait l'interception `beforeRemove`, et confirmer rejouait ensuite une action capturée qui pouvait ne pas aboutir correctement. Le bouton retour appelle maintenant une fonction dédiée qui vérifie elle-même s'il y a des modifications avant de partir — beaucoup plus fiable, et ça règle aussi le problème "Créer depuis le catalogue → retour sur Planning au lieu de Catalogue" par la même occasion (cause commune).
3. ✅ Historique du planning : nouvel écran **Plus → Avancé → Historique**, liste les 60 derniers ajouts (plat, jour, créneau), avec "Modifier" (ouvre la fiche) et "Retirer" (avec confirmation).
4. ✅ Répétitions ("tous les jours", etc.) : toute une série partage maintenant un identifiant commun. **Maintenir le nom d'un plat** dans le planning (vue Jour) ouvre un menu : voir la recette, retirer ce repas, ou — si le repas fait partie d'une série — **retirer toute la série à partir de cette date** (garde les occurrences passées).
5. ✅ Message d'aide ajouté en bas du planning (vue Jour) expliquant l'appui long et le lien vers l'historique.
6. ✅ Loupe/crayon de sélection d'article : déplacés à l'intérieur du champ "Nom de l'ingrédient" (à droite), au lieu de boutons séparés à côté — gagne de la place et reste visible même si le champ est plein.
7. ✅ Suppression d'une étape de la recette possible (bouton ✕), avec confirmation.
8. ✅ Glisser-déposer (ingrédients/étapes) : le mouvement est maintenant borné à la zone valide (avec un léger effet élastique aux bords) plutôt que de pouvoir dériver n'importe où à l'écran.
9. ✅ Glisser à la souris (catégories, suggestions d'étapes, poignées ☰) : ne sélectionne plus le texte au passage.
10. ✅ Carré emoji : hauteur exactement alignée sur le champ "Nom du plat" (40px, au lieu d'une valeur approximative).
11. ✅ Confirmation avant suppression généralisée : ajoutée là où elle manquait encore (suppression d'un article dans "Liste d'articles" / la fenêtre d'édition rapide).
12. ✅ Arrondi des quantités par unité : confirmé avec toi, déjà en place tel quel (fractions pour pièce/boîte/tranche/gousse/sachet/càs/càc/pincée, entier pour g/kg/ml/L) — rien à changer.
13. ✅ Catalogue : bouton "🌍 Publier" dans l'en-tête pour publier plusieurs recettes de "Mes plats" directement depuis le catalogue (en plus du bouton déjà existant dans "Tous les plats"). Nouvelle section "📤 Mes recettes publiées" avec un bouton "Retirer" pour dépublier une recette que tu as toi-même partagée.

**Migration 023 à exécuter** (SQL envoyé dans le chat — ajoute l'identifiant de série de répétition et la date de création sur `planning_entries`, nécessaires pour les points 3 et 4).

**Non testé visuellement** (pas d'identifiants) — compilation vérifiée sans erreur à chaque étape.

## Chantier en cours (2026-08-02, retours après le lot précédent)

1. ✅ **Bug résolu (vraie cause) : "Quitter sans enregistrer" nécessitait deux appuis** — confirmer relançait un `router.back()`/dispatch, qui redéclenchait l'interception du garde-fou puisque le formulaire était encore marqué "modifié" à cet instant précis, absorbant le premier appui. Un verrou empêche maintenant cette ré-interception.
2. ✅ Historique regroupé par série : une répétition ("tous les jours" etc.) apparaît comme une seule ligne (nom du plat, date de début → date de fin, fréquence), avec "Retirer toute la série" en un clic, au lieu d'une ligne par occurrence.
3. ✅ Planning : maintenir le nom d'un plat faisant partie d'une série propose maintenant deux options — retirer la série à partir de cette date, ou **toute la série (passé compris)**.
4. ✅ **Bug corrigé : alignement emoji / nom du plat** — trouvé la vraie cause : le champ "Nom du plat" a une marge basse intégrée (composant partagé `Field`) que le carré emoji n'avait pas, ce qui le décalait plus bas malgré des hauteurs de boîte identiques. Marge ajoutée en miroir.
5. ✅ Glisser à la souris sans sélectionner le texte : corrigé aussi pour Personnalisation (glisser-déposer des catégories/rayons) et la vue Semaine du planning, qui n'avaient pas ce correctif.
6. ✅ Écran **Paramètres** (Plus → Avancé) : version de l'app, lien vers le code source, réinitialisation des préférences propres à cet appareil (thème/taille du texte/tutoriel).
7. ✅ Écran **Feedback** (Plus → Avancé) : formulaire d'envoi + historique de tes propres envois. **Migration 024 à exécuter** (nouvelle table `feedback`).
8. ✅ Migration 024 corrigée (rejouable sans erreur — la 1ère tentative avait déjà créé la table et les règles, `create policy` n'a pas de "if not exists" contrairement à `create table`).
9. ✅ Historique : mode "Gérer" avec sélection multiple, "Tout sélectionner", suppression groupée.

**Rappel important sur le regroupement par série (points 2-3 ci-dessus)** : ça ne fonctionne que pour les repas planifiés avec répétition **après avoir exécuté la migration 023 et ce lot de code**. Les séries créées avant n'ont pas d'identifiant de groupe rétroactif (technique : on ne peut pas deviner après coup quelles entrées existantes appartenaient à la même série) — elles resteront affichées comme des entrées isolées dans l'historique.

**Migrations à exécuter : 023 (si pas déjà fait) puis 024** (SQL envoyé dans le chat).

**Non testé visuellement** (pas d'identifiants) — compilation vérifiée sans erreur.

## Chantier en cours (2026-08-02, retours utilisateur — lot 5 points)

1. ✅ Historique : bouton "Modifier la date" (série ou entrée isolée) — ouvre un calendrier ; pour une série, décale toutes les occurrences du même écart en jours (garde l'intervalle d'origine). `setEntryDate`/`shiftRecurrenceGroup` dans `src/data/planning.ts`.
2. ✅ Scroll à la souris sans sélection de texte : appliqué aux catégories de "Tous les plats" et du Catalogue de recettes (`useWebHorizontalDrag`, manquait sur ces deux écrans — déjà en place ailleurs).
3. ✅ **Notifications de repas (cadrées)** — Plus → Options avancées → section "Notifications" : active la permission navigateur, un horaire (HH:mm) par repas actif ; calcule "commencer à préparer à…" à partir du temps de préparation le plus long des plats prévus ce jour-là pour ce créneau. Réglages stockés **localement par appareil** (comme thème/taille du texte), pas partagés dans le foyer. **Limite importante : pas de notification en arrière-plan** (nécessiterait un serveur de push) — ne se déclenche que si l'app reste ouverte dans un onglet au moment voulu (vérifié toutes les minutes). `src/lib/notifications.ts`, `src/lib/useMealReminders.ts`.
4. ✅ **Mode hors ligne (première version)** :
   - App installée en PWA : se recharge maintenant hors connexion (service worker `public/sw.js`, cache tout ce qui a déjà été chargé en ligne). Ne fonctionne qu'après une première visite en ligne.
   - Liste de courses : lecture hors ligne (dernière liste chargée pour la période affichée, mise en cache localement) ; cocher/décocher un article hors ligne fonctionne (mise en file d'attente locale), synchronisé automatiquement au retour de connexion.
   - **Limites connues** : seule la liste de courses a l'écriture hors ligne (pas le planning ni les plats pour l'instant, cf. demande initiale centrée sur "au supermarché") ; le cache d'une période (jour/semaine/plage) n'est mis à jour qu'à la prochaine consultation en ligne, donc un changement fait sur un appareil pendant que l'autre est hors ligne peut ne pas apparaître tout de suite. `src/lib/offlineStore.ts`, `src/lib/offlineSync.ts`, adaptations dans `src/data/groceries.ts`.
5. ✅ **Import de recette sans IA** — "Tous les plats" → "+ Nouveau" → "📋 Importer un texte de recette" (`app/plat/importer.tsx`) : coller un texte, découpage basique par mots-clés ("Ingrédients"/"Étapes"/"Préparation") en ingrédients/étapes, pré-remplit le formulaire habituel pour correction avant d'enregistrer. Pas d'IA (pas de clé API) : moins fiable sur des textes mal structurés, texte sans ces en-têtes part entièrement en étapes à trier à la main. Pas de lien/image pour l'instant (demande initialement plus large, réduite à la version simple par choix de l'utilisateur).

**Aucune migration pour ce lot** (tout est stocké côté client — AsyncStorage/cache local).

**Non testé visuellement** (pas d'identifiants) — compilation TypeScript vérifiée sans erreur.

## Chantier en cours (2026-08-02, lot suivant — historique, marges, Amis, import)

1. ✅ **Historique — modifier une série complètement** : le bouton devient "Modifier dates / répétition" et ouvre une fenêtre avec **date de début, date de fin et fréquence** (tous les jours / 2 jours / 3 jours / semaine / 2 semaines). La série est **régénérée** avec ces réglages (les anciennes occurrences sont remplacées, l'identifiant de série et le plat/créneau/portions sont conservés) — c'est le seul moyen fiable de changer un intervalle, puisque le nombre d'occurrences change. Une entrée isolée garde juste la correction de date. `rescheduleRecurrenceGroup` dans `src/data/planning.ts`.
2. ✅ **Marge sur les catégories qui défilent** : la zone de défilement elle-même est maintenant en retrait de 18px (`marginHorizontal` sur le ScrollView au lieu d'un padding sur son contenu), donc les vignettes disparaissent avant le bord de l'écran au lieu d'être coupées net contre lui. Corrigé sur **Catalogue de recettes** et **Sélecteur de plat** (qui avait le même défaut) ; "Tous les plats" était déjà correct (son conteneur avait déjà la marge). Le glisser-souris sans sélection de texte a aussi été ajouté au sélecteur de plat au passage.
3. ✅ **Partie "Amis"** (remplace la page d'attente) — **migration 025 à exécuter** :
   - **Identifiant public façon Discord** : chaque compte a un `Pseudo#1234`, affiché en haut de la page Amis avec un bouton "Copier". Le numéro à 4 chiffres est unique **pour un même pseudo** (deux "Marie" possibles, avec des numéros différents). Il est réattribué automatiquement si tu changes de pseudo.
   - **Ajouter un ami** en tapant son `Pseudo#1234` → demande en attente, que l'autre accepte ou refuse. Sections "Demandes reçues" / "Demandes envoyées" / "Mes amis" (avec retrait possible).
   - **Envoyer une recette à un ami précis** : bouton "👤 Envoyer à un ami" sur la fiche d'une de tes recettes. L'ami la voit dans "📥 Recettes reçues" (page Amis) et peut l'ajouter à Mes plats (copie complète) ou l'ignorer. Différent du catalogue communautaire, qui reste public pour tout le monde.
   - **Inviter un ami à un repas** : appui long sur un plat du planning → "👤 Inviter un ami à ce repas". L'ami voit le repas dans "🍽️ Repas où je suis invité" et peut ouvrir un écran (`/repas-invite`) montrant **les plats prévus et la liste de courses de ce repas** (lecture seule, quantités telles que prévues par l'hôte). L'invitation porte sur le créneau entier (date + repas), pas sur un plat isolé.
   - **Limites connues** : les portions de l'hôte ne changent pas automatiquement quand il invite quelqu'un (à ajuster à la main s'il veut cuisiner plus) ; pas de notification, l'ami doit aller voir la page Amis.
4. ✅ **Import de recette par texte nettement amélioré** (toujours sans IA) :
   - Reconnaît plus d'en-têtes ("Ingrédients", "Ce qu'il vous faut", "Étapes", "Préparation", "Réalisation", "Marche à suivre"...) et **ignore** les sections inutiles ("Matériel", "Astuces", "Notes", "Valeurs nutritionnelles").
   - Détecte automatiquement le **nombre de personnes** ("Pour 6 personnes") et le **temps de préparation** ("Préparation : 20 min", "1 h 30").
   - Comprend les **fractions** (½, ¾, "1/2"), les **unités écrites de plein de façons** (g/gr/gramme, càs/c.à.s/cuillère à soupe, tbsp...), convertit **cl et dl en ml** (l'app ne gère pas ces unités), et garde une unité inconnue ("tasse") dans le nom au lieu de la perdre.
   - Gère le format "Farine : 250 g" (nom d'abord) autant que "250 g de farine".
   - Sans aucun en-tête reconnu : devine ligne par ligne (ligne courte commençant par un chiffre = ingrédient, ligne longue ou ponctuée = étape) au lieu de tout envoyer en étapes.
   - **Aperçu du résultat** (nom, nombre d'ingrédients/étapes, temps, premières lignes) avant d'ouvrir le formulaire, avec un bouton "Modifier le texte" pour recommencer.
   - **Vérifié par des tests** sur 3 formats de texte typiques (site de cuisine classique, format "nom : quantité" avec section Matériel, texte brut sans en-tête) — les trois sont correctement découpés.

**Migration 025 à exécuter** (SQL envoyé dans le chat). **Non testé visuellement** (pas d'identifiants) — compilation TypeScript et build web vérifiés sans erreur, l'app démarre et l'écran de connexion s'affiche sans erreur console.

## Chantier en cours (2026-08-03)

1. ✅ **Amis : accepter/refuser une invitation à un repas** — l'invité voit désormais des boutons "Accepter"/"Refuser" tant que l'invitation est en attente ; refuser la retire, accepter donne accès aux plats et à la liste de courses (auparavant visibles sans confirmation). **Migration 026 à exécuter** (colonne `status` sur `meal_invites` + RLS resserrée : plats/ingrédients/étapes de recette ne sont lisibles par l'invité qu'après acceptation). `src/data/friends.ts` (`respondToMealInvite`), `app/(tabs)/profil/amis.tsx`.

**Non testé visuellement** (pas d'identifiants) — compilation TypeScript vérifiée sans erreur.

## Chantier en cours (2026-08-04 — filtre courses, uniformisation, Alimentation, formulaire de plat)

1. ✅ **Filtre coché/décoché** de la liste de courses remplacé par un interrupteur discret "Masquer cochés" aligné à droite (au lieu des 3 puces Tous/À acheter/Cochés, jugées trop visibles). 5 présentations proposées et choix validé par l'utilisateur.
2. ✅ **En-têtes des groupes uniformisés** entre "Par catégorie" et "Par plat" : les deux utilisent maintenant le même style carte (comme les plats avant), avec les articles à l'intérieur en lignes compactes (au lieu des cartes à ombre séparées côté "Par catégorie").
3. ✅ **"Tout prêt" renommé en "Alimentation"** partout (onglet, formulaire, menu d'ajout, fiche plat).
4. ✅ **Catégories d'Alimentation = rayons** (Fruits & légumes, Produits laitiers, Féculents, Surgelés...) au lieu des catégories de recette (Français/Italien/Rapide...), qui n'avaient pas de sens pour un yaourt ou du pain. Champ "Catégorie"/"Type de plat" masqué dans le formulaire pour un article Alimentation (remplacé par le "Rayon" déjà présent) ; les vignettes de filtre dans l'onglet Alimentation affichent maintenant les rayons.
5. ✅ **Formulaire de plat** : traits de séparation retirés entre les lignes d'ingrédients (et au-dessus de "+ Ajouter un ingrédient") ; les zones de texte des étapes de recette s'ajustent maintenant à la hauteur du contenu (1 ligne reste compacte, un texte plus long agrandit la zone).

**Aucune migration pour ce lot** (changements d'interface uniquement).

**Non testé visuellement** (pas d'identifiants) — compilation TypeScript vérifiée sans erreur.

## Chantier en cours (2026-08-03, lot 3 — produits tout prêts, liste de courses)

1. ✅ **Produits tout prêts (surgelés, plats déjà préparés achetés en l'état)** — nouvel onglet "🧊 Tout prêt" à côté de "📖 Recettes" dans "Tous les plats" (menu "+" → "🧊 Ajouter un produit tout prêt"). Formulaire simplifié : pas d'ingrédients ni d'étapes, juste Quantité/Unité/Rayon pour le produit lui-même. Dans la liste de courses, le plat génère directement 1 article (son propre nom), pas de décomposition en ingrédients. **Migration 027 à exécuter** (colonne `is_ready_made` sur `dishes`). `src/components/DishForm.tsx`, `app/(tabs)/plats/index.tsx`, `app/plat/[id].tsx`.
2. ✅ **Liste de courses, vue "Par plat"** : les articles ajoutés manuellement (hors plat) apparaissent maintenant aussi dans cette vue (section "📝 Ajoutés manuellement" en bas), auparavant invisibles dans ce mode.
3. ✅ **Filtre coché/décoché** : "Tous / À acheter / Cochés" au-dessus de la liste, dans les deux vues.
4. ✅ **Rayons et plats pliables** : chaque rayon (vue par catégorie) et chaque plat (vue par plat) a maintenant un chevron ▾/▸ cliquable pour replier/déplier manuellement, indépendamment du fait que tout soit coché ou non (avant, seul un groupe 100% coché pouvait se replier). En vue "Par plat", toucher l'en-tête d'un plat replie/déplie désormais (au lieu d'ouvrir la fiche recette) ; ouvrir la fiche se fait par appui long, comme avant.
5. ✅ **Rayons/plats complets en bas** : un rayon ou un plat entièrement coché redescend en bas de la liste (dans chaque vue), le reste garde son ordre.

**Non testé visuellement** (pas d'identifiants) — compilation TypeScript vérifiée sans erreur.

## Chantier en cours (2026-08-03, suite)

1. ✅ **Ajouter au planning (fiche recette)** : date de fin de répétition rendue optionnelle (3 mois par défaut si non choisie) ; date de début et date de fin affichées côte à côte, même taille ; vignettes rapides "3 mois / 6 mois / 1 an" + "Date précise…" pour la fin, à la place du seul bouton calendrier ; ordre des champs : Date → Repas → Répétition.
2. ✅ **Historique** : cliquer sur le nom du plat ouvre sa fiche recette (lien "Voir la recette" supprimé, redondant) ; la fenêtre "Modifier dates / répétition" reprend la même présentation (dates côte à côte, vignettes 3/6/12 mois pour la fin).

**Aucune migration pour ce lot** (changements d'interface uniquement).

## Chantier en cours (2026-08-04, suite — retours utilisateur)

1. ✅ **Liste de courses : interrupteur "Masquer cochés" déplacé** sous la ligne "Semaine du...", aligné à droite (au lieu d'être au-dessus des onglets Jour/Semaine/Plage).
2. ✅ **Sections repliées par défaut** dans la liste de courses (rayons en vue "Par catégorie", plats en vue "Par plat") — avant, seul un groupe 100% coché démarrait replié ; maintenant tout démarre replié, à déplier au clic.
3. ✅ **Bug corrigé (2026-08-04, 2e tentative) : écran blanc à l'ouverture de création/modification de plat.** Cause confirmée par capture d'écran utilisateur (erreur React #185 "Too many re-renders" dans `onContentSizeChange`) : le redimensionnement automatique des zones de texte d'étape de recette (ajouté au lot du 2026-08-04) provoquait une boucle infinie propre à React Native Web, pas seulement un problème d'état React (un premier correctif avec garde-fou anti-doublon n'a pas suffi). **Fonctionnalité retirée** plutôt que rafistolée : les zones de texte d'étape ont maintenant une hauteur minimale fixe (60px, ~3 lignes) au lieu de s'ajuster dynamiquement au contenu — reste utilisable pour des étapes plus longues (défilement interne), sans le risque de plantage. `src/components/DishForm.tsx`, `StepRow`.
4. 🔵 **Connexion Google cassée pour un autre compte (Android, site en ligne, aucune erreur visible)** — symptôme (retour silencieux à la page de connexion) typique d'une URL de redirection non autorisée côté Supabase. **À vérifier par l'utilisateur** dans le tableau de bord Supabase (projet `kjltmojlewrnwimzskgj`) → Authentication → URL Configuration → "Redirect URLs" : s'assurer que `https://junikairou.github.io/monpanier/` y figure exactement (avec le slash final). C'est un réglage du projet Supabase, l'agent n'y a pas accès.
5. ✅ **Mode invité (sans compte, sauvegarde locale uniquement)** — "Continuer sans compte" sur l'écran de connexion. Aucune donnée envoyée à Supabase : plats, planning, courses et modèle de semaine sont stockés localement sur l'appareil (AsyncStorage/localStorage), avec un identifiant utilisateur/foyer fictif (`guest-local`). Catégories/types de plat/rayons/créneaux repris tels quels (valeurs par défaut d'un nouveau foyer), pas personnalisables en invité. Onglet Plus réduit à Préférences + Avancé (pas de Partage du foyer/Amis/Recettes catalogue/Articles/Personnalisation, qui nécessitent un compte) ; bouton "Quitter le mode invité" en bas (efface les données locales après confirmation, puisque rien n'est sauvegardé ailleurs). Testé de bout en bout dans le navigateur (création de plats, ajout au planning, liste de courses calculée correctement, aucune erreur console).
   - Fichiers principaux : `src/lib/guest.ts` (état du mode invité), `src/lib/localTable.ts` (stockage générique), `src/data/guestBackend.ts` (implémentation locale de toutes les opérations plats/planning/courses/modèle/profil/taxonomies), `src/lib/auth.tsx` (session fictive, `enterGuestMode`/`exitGuestMode`), et un branchement `if (guest) ... else supabase ...` ajouté dans `src/data/dishes.ts`, `planning.ts`, `groceries.ts`, `profile.ts`, `template.ts`, `taxonomies.ts`, `household.ts`, `ingredientsCatalog.ts`.
   - **Limite connue** : "Envoyer un feedback" (Plus → Avancé → Feedback) tentera toujours d'écrire vers Supabase même en mode invité et échouera proprement (message d'erreur, pas de plantage) — jugé acceptable, un message pour le développeur n'a pas de sens à rester local.
   - **Aucune migration Supabase pour ce lot** (fonctionnalité 100% locale, ne touche pas Supabase).
6. ✅ **Bascule invité → vrai compte, sans perte de données** — Plus → bandeau "Mode invité" → écran dédié (`app/(tabs)/profil/lier-compte.tsx`) : créer un compte ou se connecter à un compte existant réinsère tels quels tous les plats/planning/courses/modèle locaux sous le nouveau compte (même id, donc pas de remapping — voir `src/data/guestMigration.ts`), copie aussi les préférences (langue, unités, régime, repas actifs, options d'affichage), puis vide le stockage local et bascule sur la vraie session (`adoptRealSession` dans `src/lib/auth.tsx`). Le nouveau compte passe ensuite par l'onboarding normal (taille du foyer). Bouton "Quitter sans sauvegarder" du mode invité reformulé pour bien distinguer les deux chemins.
   - **Vérifié le chemin local** (écriture/lecture des données invité, garde d'accès à l'écran réservé au mode invité, compilation TypeScript). **Le clic sur "Créer mon compte" n'a pas pu être déclenché de façon fiable dans l'environnement de navigateur automatisé de l'agent** (même souci constaté plus tôt sur l'écran d'inscription standard, indépendant de ce code — aucune requête réseau ne partait au clic). La logique reprend telle quelle le mécanisme d'inscription/connexion existant (`supabase.auth.signUp`/`signInWithPassword`), donc probablement correcte, mais **le passage invité → compte réel n'a pas pu être testé de bout en bout** — à vérifier par l'utilisateur avant de compter dessus pour une bascule importante.
   - **Aucune migration Supabase** (l'écran réutilise les tables existantes).

**Migrations pour ce lot : aucune** (changements d'interface uniquement, hors point 5 à venir).

## Pas fait / en attente

- Traduction anglaise complète de l'interface
- Icône PWA personnalisée (branding Mijoté)
- Import de recette par **lien ou photo** — pas de clé API Anthropic pour l'analyse ; seul l'import par **texte collé** existe (amélioré le 2026-08-02, voir plus haut)
- Amis : ajustement automatique des portions de l'hôte, notifications d'invitation
- Mode hors ligne : écriture hors ligne limitée à la liste de courses pour l'instant (planning/plats en lecture seule tant que la connexion est coupée) — voir limites au 2026-08-02
- Build natif Android pour le Play Store — prévu **plus tard**, pas commencé (nécessite un compte Google Play Developer, ~25$ une fois)
- Déploiement automatique Vercel — abandonné au profit de GitHub Pages (2026-07-30)

## Points d'attention techniques

- **Migrations SQL** à exécuter manuellement dans Supabase (SQL Editor) : `supabase/schema.sql` puis `supabase/migrations/001...021` dans l'ordre. Vérifier ce qui est déjà appliqué avant d'ajouter une migration. Migrations 009 à 019 exécutées. **Migrations 020 et 021 en attente** (020 : catalogue d'articles par foyer ; 021 : catalogue communautaire + nutriments par article).
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
