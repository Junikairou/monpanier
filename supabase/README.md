# Base de données — que fait chaque fichier SQL

Chaque fichier de `migrations/` est un changement de base à exécuter **une seule
fois**, dans l'ordre des numéros, via le SQL Editor de Supabase.

- **Base neuve** : exécuter `schema.sql`, puis les migrations `002` à `029` dans l'ordre.
- **Base en service** : n'exécuter que celles qui manquent (les dernières).
- Il n'y a pas de migration `001` : c'est `schema.sql` qui tient ce rôle.

Nom conseillé pour tes requêtes enregistrées dans Supabase : reprends la
colonne « Nom à donner » ci-dessous, tu retrouveras chaque changement d'un coup
d'œil au lieu de « Untitled query » ou « 025 ».

| Fichier | Nom à donner dans Supabase | Ce que ça fait |
|---|---|---|
| `schema.sql` | `000 — schéma d'origine` | Tables de départ : plats, ingrédients, étapes de recette, planning, liste de courses, profils. |
| `002_onboarding.sql` | `002 — questionnaire de première connexion` | Mémorise si le questionnaire de départ a été passé. Les comptes antérieurs en sont dispensés. |
| `003_grocery_merge_key.sql` | `003 — état coché des articles` | Garde le « coché » d'un article quelle que soit la période affichée (jour / semaine). |
| `004_fix_grocery_merge_key_index.sql` | `004 — correctif de la 003` | L'index posé par la 003 empêchait d'enregistrer le « coché ». Corrige ça. |
| `005_meal_courses_calories.sql` | `005 — type de plat et calories` | Entrée / plat / accompagnement / dessert / boisson, et calories saisies à la main. |
| `006_restaurant_meals.sql` | `006 — repas au restaurant` | Marquer un créneau comme « au restaurant » : repas prévu, sans recette. |
| `007_theme_rose_bleu.sql` | `007 — thèmes rose et bleu` | Autorise deux nouveaux thèmes dans le profil. |
| `008_balance_hint_toggle.sql` | `008 — masquer « repas équilibré »` | Interrupteur pour cacher l'indicateur d'équilibre du repas. |
| `009_meal_cooked.sql` | `009 — case « Cuisiné »` | Cocher qu'un repas planifié a bien été cuisiné. |
| `010_planning_template.sql` | `010 — modèle de semaine` | Un planning type, rempli une fois, applicable sur une semaine réelle. |
| `011_profile_phone.sql` | `011 — téléphone dans le profil` | Champ informatif uniquement, pas utilisé pour la connexion. |
| `012_households.sql` | `012 — foyers partagés` | Planning et courses communs entre membres d'un foyer, avec code d'invitation temporaire. |
| `013_custom_taxonomies.sql` | `013 — catégories personnalisables` | Catégories de plat, types de plat et rayons deviennent modifiables par foyer. |
| `014_dish_macros.sql` | `014 — macro-nutriments` | Protéines / glucides / lipides sur les plats, saisis à la main. |
| `015_servings.sql` | `015 — nombre de personnes` | Une recette est prévue pour N personnes ; chaque repas planifié peut en servir un autre nombre. |
| `016_shared_dishes_and_profile.sql` | `016 — partage des plats par foyer` | Répare la 012 : les plats, ingrédients et étapes étaient restés privés alors que le reste était partagé. |
| `017_prep_time_and_defaults.sql` | `017 — temps de préparation` | Ajoute le temps de préparation, et un réglage pour masquer les champs nutrition. |
| `018_household_roles.sql` | `018 — chef de foyer` | Rôles « chef » et « membre » ; le premier arrivé devient chef. |
| `019_meal_slot_taxonomy.sql` | `019 — créneaux personnalisables` | Petit-déj, déjeuner, goûter, dîner… deviennent modifiables par foyer. |
| `020_ingredients_catalog.sql` | `020 — catalogue d'articles` | Liste d'ingrédients courants par foyer, pré-remplie, pour ne pas les retaper. |
| `021_public_catalog_and_ingredient_nutrition.sql` | `021 — catalogue de recettes public` | Publier une recette pour les autres foyers, et nutrition portée par les ingrédients. |
| `022_public_dish_author_profile_read.sql` | `022 — auteur des recettes publiques` | Permet d'afficher le nom de la personne qui a publié une recette. |
| `023_planning_recurrence_group.sql` | `023 — séries de repas répétés` | Modifier ou supprimer d'un bloc une série (« tous les jours jusqu'au… »). |
| `024_feedback.sql` | `024 — messages de feedback` | Table des messages envoyés depuis Plus → Avancé → Feedback. |
| `025_friends.sql` | `025 — amis` | Identifiant public Pseudo#1234, demandes d'ami, envoi de recette, invitation à un repas. |
| `026_meal_invite_status.sql` | `026 — accepter/refuser une invitation` | Tant que l'invitation n'est pas acceptée, l'invité ne voit ni les plats ni la liste de courses. |
| `027_ready_made_dishes.sql` | `027 — plats tout prêts` | Surgelés et plats achetés en l'état : pas de recette, un seul article en courses. |
| `028_dish_photos.sql` | `028 — photos de recette` | Stockage des photos de plat, en lecture publique et en écriture réservée à leur propriétaire. |
| `029_fix_signup_trigger.sql` | `029 — répare la création de compte` | Corrige « Database error saving new user » : la fonction qui crée profil et foyer ne trouvait plus ses tables. |

## Le déclencheur de création de compte

À chaque inscription, `on_auth_user_created` appelle `public.handle_new_user()`,
qui crée le profil, le foyer et toutes ses valeurs par défaut. Cette fonction a
été redéfinie par les migrations 013, 017, 018, 019, 020 puis 029 — **seule la
dernière compte**, chacune remplaçant entièrement la précédente.

Si une inscription échoue avec « Database error saving new user », c'est cette
fonction qui a planté : le détail exact est dans Supabase → Authentication →
Logs. Une insertion qui échoue annule la création du compte tout entière.
