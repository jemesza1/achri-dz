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
- Déposer une annonce (`/vendre`) nécessite d'être connecté **et** d'avoir confirmé son email ou son téléphone (voir ci-dessous) ; l'email du vendeur est toujours celui du compte authentifié et ne peut pas être falsifié depuis le formulaire.
- Pensez à définir un `JWT_SECRET` fort avant tout déploiement en production (voir `.env.example`).

### Connexion Google

- Bouton "Continuer avec Google" sur `/connexion`, propulsé par Google Identity Services côté client et vérifié côté serveur (`google-auth-library`).
- Sans `GOOGLE_CLIENT_ID` configuré, le bouton est simplement masqué (pas d'erreur visible) — le site reste pleinement fonctionnel en email/mot de passe.
- Pour l'activer : créer un projet sur [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Identifiants → Créer des identifiants → ID client OAuth → Application Web. Ajouter l'URL du site dans "Origines JavaScript autorisées". Coller le Client ID obtenu dans `GOOGLE_CLIENT_ID`. Gratuit, ~5 minutes.

### Vérification email / téléphone

- À l'inscription, le compte est créé mais marqué non vérifié ; un lien de confirmation est envoyé par email (`/api/auth/verify-email`).
- Depuis `/profil`, l'utilisateur peut aussi renvoyer ce lien ou demander un code par SMS (6 chiffres, valable 10 minutes) pour vérifier son téléphone à la place.
- Publier une annonce exige qu'**au moins une** des deux méthodes soit confirmée (anti-spam/anti-faux comptes).
- **Sans `SMTP_*` / `TWILIO_*` configurés**, les liens et codes sont simplement affichés dans les logs du serveur au lieu d'être envoyés — pratique pour tester en local, **mais inutilisable pour de vrais utilisateurs**. Voir `.env.example` pour la configuration SMTP (ex. Gmail) et Twilio (SMS, payant).
- Les comptes créés avant l'ajout de cette fonctionnalité sont automatiquement considérés comme vérifiés (pas de blocage rétroactif).

## Sécurité avant de publier sur GitHub

- Ne commitez jamais `.env`, `.env.local` ni `data/db.json` (vrais comptes, mots de passe hashés, messages, numéros de téléphone) — ils sont listés dans `.gitignore`. Le fichier `data/db.json` est recréé automatiquement (vide) au premier lancement.
- Définissez un `JWT_SECRET` unique et aléatoire dans l'environnement de production : `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Sans lui, le serveur refuse de démarrer en production (il ne tourne qu'avec un secret de secours non sécurisé en local).
- Définissez `APP_URL` en production avec l'URL exacte de votre site déployé — c'est la seule origine autorisée à faire des requêtes authentifiées (CORS), et c'est aussi le domaine utilisé dans les liens de vérification email. En développement, toute origine `localhost` est acceptée.
- Si vous forkez/publiez ce dépôt, vérifiez qu'aucune clé réelle (`GEMINI_API_KEY`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `SMTP_PASS`, `TWILIO_AUTH_TOKEN`, etc.) n'a été committée par erreur avant de rendre le dépôt public — `git log -p` ou un scanner de secrets (ex. `gitleaks`) peuvent aider.

## Déploiement (Render)

Ce projet a un vrai backend Express (auth, base de données, API) — **il ne peut donc pas être hébergé sur GitHub Pages** (fichiers statiques uniquement). Le déploiement recommandé est [Render](https://render.com), gratuit pour démarrer :

1. Sur [dashboard.render.com](https://dashboard.render.com), **New → Blueprint**, connectez ce dépôt GitHub. Render détecte automatiquement `render.yaml` à la racine et configure le service (build : `npm ci && npm run build`, démarrage : `npm start`).
2. Une fois le service créé, allez dans **Environment** et renseignez les variables marquées `sync: false` dans `render.yaml` (voir la liste ci-dessous) — Render ne les devine pas, il faut les saisir manuellement.
3. Render fournit HTTPS automatiquement sur le sous-domaine `*.onrender.com` (ou un domaine personnalisé si vous en ajoutez un).

⚠️ **Limitation importante du plan gratuit** : le système de fichiers est **éphémère** — `data/db.json` (comptes, annonces, messages) est remis à zéro à chaque redéploiement ou redémarrage du service. Pour de vrais utilisateurs en production, il faut soit :
- passer à un plan payant Render et ajouter un disque persistant (Render → service → Disks), soit
- migrer le stockage vers une vraie base de données externe (PostgreSQL géré, par ex. Render Postgres ou Supabase) — non implémenté actuellement.

## Checklist avant de passer en public

1. **Hébergement compatible Node.js** (voir section Déploiement ci-dessus) — bloquant, GitHub Pages ne fonctionnera pas.
2. **Variables d'environnement** (à définir sur la plateforme d'hébergement, jamais committées) :
   - `JWT_SECRET` — obligatoire, sinon le serveur refuse de démarrer en production.
   - `APP_URL` — l'URL exacte du site déployé (ex. `https://achri-dz.onrender.com`).
   - `GEMINI_API_KEY` — optionnel, sinon génération de description en mode démo.
   - `GOOGLE_CLIENT_ID` — optionnel, sinon le bouton Google est masqué.
   - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — requis pour envoyer de vrais emails de vérification. Sans eux, les liens ne partent que dans les logs serveur.
   - `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` — requis pour envoyer de vrais SMS. Sans eux, les codes ne partent que dans les logs serveur.
3. **HTTPS** — le cookie de session passe en mode `secure` automatiquement dès que `NODE_ENV=production` ; le site doit donc être servi en HTTPS (Render le fait automatiquement).
4. **Persistance des données** — voir l'avertissement sur le plan gratuit Render ci-dessus ; ne pas lancer publiquement sans avoir réglé ce point, sous peine de perdre tous les comptes/annonces au prochain redéploiement.
5. **Limites de débit** déjà en place : 100 req/15 min par IP sur `/api/`, 20/15 min sur les routes d'authentification, 30/15 min sur les actions sensibles (enchères, achats, messages, génération IA) — à ajuster dans `server.ts` selon le trafic réel observé.

## Notes

- Aucune dépendance à Firebase : tout est géré via le fichier `data/db.json` local pour rester simple en développement.

