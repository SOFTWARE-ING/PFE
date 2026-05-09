# All routers - Backend FastAPI

Ce fichier décrit les routeurs chargés par `backend/all_routers.py` et les endpoints exposés par le backend.

## Routeurs inclus

Le routeur global de l'application est défini dans `backend/all_routers.py` et rassemble les sous-routeurs suivants :

- `app.routes.ocr` → préfixe `/ocr`
- `app.routes.login` → préfixe `/auth`
- `app.routes.register` → préfixe `/register`
- `app.routes.search` → préfixe `/search`
- `app.routes.signatures` → préfixe `/signatures`
- `app.routes.keys` → préfixe `/keys`

> Remarque : `all_routers.py` inclut également des imports redondants pour `login` et `register` (`login.router` + `login_router`, `register.router` + `register_router`). Ceci ne change pas le fonctionnement des routes exposées, mais peut être simplifié si nécessaire.

## Préfixe global de l'API

Dans `app/main.py`, le routeur global est monté sous :

- `/api`

Donc chaque route documentée ci-dessous devient, par exemple :

- `/api/ocr/extract`
- `/api/auth/login`
- `/api/register/agent`
- `/api/search/simple`
- `/api/keys/generate`
- `/api/signatures/sign`

## Routes documentées

### OCR

- `POST /api/ocr/extract`
  - Upload de fichier (`pdf`, `docx`, `png`, `jpg`, `jpeg`)
  - Retourne le texte extrait pour indexation et recherche

### Authentification / 2FA

- `POST /api/auth/login`
  - Authentifie via `email` + `mot_de_passe`
  - Renvoie un token JWT final ou un token temporaire si 2FA actif

- `POST /api/auth/2fa/request-email`
  - Envoie un code 2FA par email

- `POST /api/auth/verify-2fa`
  - Vérifie le code 2FA (Google Authenticator ou email)
  - Renvoie le JWT final

- `POST /api/auth/2fa/enable`
  - Active le 2FA pour l'utilisateur connecté
  - Retourne un secret et un QR code

- `POST /api/auth/2fa/disable`
  - Désactive le 2FA pour l'utilisateur connecté

### Inscription

- `POST /api/register/agent`
  - Inscription d'un agent officiel

- `POST /api/register/admin`
  - Inscription d'un administrateur

- `POST /api/register/citoyen`
  - Inscription d'un citoyen

### Recherche

- `GET /api/search/simple`
- `GET /api/search/advanced`
- `GET /api/search/highlights`
- `GET /api/search/suggestions`
- `GET /api/search/popular`
- `GET /api/search/recent`
- `GET /api/search/compare`

### Clés cryptographiques

- `POST /api/keys/generate`
  - Génère une nouvelle paire RSA pour l'agent officiel connecté

- `POST /api/keys/renew`
  - Renouvelle la paire de clés de l'agent officiel connecté

- `GET /api/keys/my-keys`
  - Liste les clés de l'agent connecté

### Signatures numériques

- `POST /api/signatures/sign`
  - Signe un communiqué avec une clé RSA privée de l'agent

- `POST /api/signatures/verify`
  - Vérifie la validité d'une signature existante

- `GET /api/signatures/validate/{communique_id}`
  - Valide l'intégrité complète d'un communiqué

- `GET /api/signatures/my-signatures`
  - Liste les signatures attachées à l'agent connecté

## Bonnes pratiques

- Utiliser `/docs` (Swagger) après le démarrage du serveur pour tester rapidement les routes.
- Mettre `Authorization: Bearer <token>` dans l'en-tête pour les routes protégées.
- Vérifier que PostgreSQL est bien lancé et que la base est initialisée avant de lancer l'API.

## Exemple de point de terminaison OCR

```http
POST http://127.0.0.1:8000/api/ocr/extract
Content-Type: multipart/form-data

fichier: [votre_fichier.pdf]
```

Réponse attendue :

```json
{
  "filname": "Document.pdf",
  "extracted_text": "Texte extrait...",
  "message": "Contenu extrait avec succes pour indexation et recherche."
}
```
