# Mijoté

App de planning repas (Expo — web pour l'instant, iOS/Android plus tard sans changer de code).

## Démarrer

```bash
cd mijote
npm run web
```

## Connecter Supabase (comptes + données)

1. Crée un projet gratuit sur [supabase.com](https://supabase.com).
2. Dans le projet : **SQL Editor > New query**, colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) et lance-le. Ça crée les tables (plats, ingrédients, recettes, planning, courses, profils) avec la sécurité par utilisateur (RLS).
3. Dans **Project settings > API**, récupère l'URL du projet et la clé `anon public`.
4. Crée un fichier `.env` à la racine de `mijote/` (copie `.env.example`) :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```
5. Relance `npm run web`.

Tant que ce fichier n'existe pas, l'app tourne quand même et affiche un avertissement — utile pour voir l'interface, mais la connexion ne fonctionnera pas.

## Ce qui est fait

- Auth (connexion / inscription par e-mail)
- Planning de la semaine, navigation vers les semaines suivantes
- Inventaire des plats (création, ingrédients, étapes de recette)
- Liste de courses générée automatiquement depuis le planning, avec fusion des quantités identiques, vue par rayon et vue par plat
- Profil : thème clair/sombre/auto, langue (préférence enregistrée), unités, taille du foyer

## Pas encore fait

- Communauté (partage de recettes entre utilisateurs)
- Traduction complète de l'interface en anglais
- Build natif iOS/Android (le code est déjà compatible Expo — `npx eas build` le moment venu)
