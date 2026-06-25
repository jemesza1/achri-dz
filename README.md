<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Achri DZ — Marketplace en ligne pour l'Algérie

Une marketplace complète (style eBay) construite avec React, Express et l'API Gemini, pensée pour le marché algérien : annonces, enchères, achat immédiat, messagerie intégrée, et génération de description par IA.

## Lancer le projet en local

**Prérequis :** Node.js (v18+)

1. Installer les dépendances :
   `npm install`
2. Copier `.env.example` vers `.env.local` et renseigner :
   - `GEMINI_API_KEY` (optionnel — sans clé, l'app fonctionne avec un texte de démonstration pour la génération de description)
   - `JWT_SECRET` (requis en production — sert à signer les sessions de connexion ; une valeur de secours non sécurisée est utilisée en développement si elle est absente)
3. Lancer l'app :
   `npm run dev`
4. Ouvrir [http://localhost:3000](http://localhost:3000)

## Structure du projet

- `server.ts` — backend Express (API REST + base de données JSON locale dans `data/db.json`)
- `src/` — frontend React (pages, composants, logique d'appel API)
- `data/db.json` — base de données simple au format JSON (annonces, messages, comptes utilisateurs), créée automatiquement au premier lancement si absente

## Authentification

- Les comptes sont de vrais comptes côté serveur : les mots de passe sont hashés avec `bcrypt` avant d'être stockés dans `data/db.json` (jamais en clair).
- La connexion repose sur une session signée (JWT) stockée dans un cookie `httpOnly` — elle n'est plus simulée via `localStorage` côté client.
- Déposer une annonce (`/vendre`) nécessite désormais d'être connecté ; l'email du vendeur est toujours celui du compte authentifié et ne peut pas être falsifié depuis le formulaire.
- Pensez à définir un `JWT_SECRET` fort avant tout déploiement en production (voir `.env.example`).

## Sécurité avant de publier sur GitHub

- Ne commitez jamais `.env`, `.env.local` ni `data/db.json` (vrais comptes, mots de passe hashés, messages, numéros de téléphone) — ils sont listés dans `.gitignore`. Le fichier `data/db.json` est recréé automatiquement (vide) au premier lancement.
- Définissez un `JWT_SECRET` unique et aléatoire dans l'environnement de production : `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Sans lui, le serveur refuse de démarrer en production (il ne tourne qu'avec un secret de secours non sécurisé en local).
- Définissez `APP_URL` en production avec l'URL exacte de votre site déployé — c'est la seule origine autorisée à faire des requêtes authentifiées (CORS). En développement, toute origine `localhost` est acceptée.
- Si vous forkez/publiez ce dépôt, vérifiez qu'aucune clé réelle (`GEMINI_API_KEY`, `JWT_SECRET`, etc.) n'a été committée par erreur avant de rendre le dépôt public — `git log -p` ou un scanner de secrets (ex. `gitleaks`) peuvent aider.

## Notes

- Aucune dépendance à Firebase : tout est géré via le fichier `data/db.json` local pour rester simple en développement.

