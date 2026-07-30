# Mon Panier — Planning de repas

Une application de planning de repas : on organise sa semaine, on gère ses plats (recettes, ingrédients) et la liste de courses se génère toute seule à partir du planning.

**Site en ligne :** https://junikairou.github.io/monpanier/
**Dépôt :** https://github.com/Junikairou/monpanier

---

## Aperçu rapide

- **Planning de la semaine** — navigation semaine par semaine, ajout/changement/suppression de repas.
- **Plats** — création de fiches recette (ingrédients + étapes), consultables et modifiables.
- **Liste de courses automatique** — générée depuis le planning, vue « par catégorie » ou « par plat », coché qui reste en mémoire.
- **Profil personnalisable** — thème clair/sombre/auto, langue, unités, taille du foyer, repas à planifier.
- **Connexion** e-mail/mot de passe ou Google.
- **Installable comme une app** (PWA) — pensée pour devenir une vraie app mobile (iOS/Android) plus tard, sans réécrire le code.

## Stack technique

Expo (React Native + web) + Supabase (comptes et base de données).

## Licence & mentions

Projet personnel. Les données de chaque compte sont privées et isolées (sécurité gérée côté base de données).
