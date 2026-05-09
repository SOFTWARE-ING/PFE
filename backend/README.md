# Backend - Système de Signature de Communiqués

Ce dossier contient l'API backend du projet, développée avec FastAPI et PostgreSQL. Elle gère l'authentification, l'inscription, l'extraction OCR, la recherche de communiqués, la gestion des clés cryptographiques et la signature numérique.

## Architecture générale

- `app/main.py` : point d'entrée FastAPI
- `app/core/` : configuration, base de données, authentification, JWT
- `app/models/` : définitions des tables SQLAlchemy
- `app/routes/` : routes API par domaine
- `app/schemas/` : schémas Pydantic pour requêtes/réponses
- `app/services/` : logique métier (auth, 2FA, OCR, recherche, clés, signatures)

## Prérequis

- Python 3.10+
- PostgreSQL
- Tesseract OCR
- Poppler (pour `pdf2image`)

### Dépendances système recommandées (Linux)

```bash
sudo apt update
sudo apt install -y python3-venv python3-dev build-essential \
  libpq-dev tesseract-ocr poppler-utils
```

## Installation locale

### 1. Cloner le dépôt distant

Depuis n'importe quel dossier local :

```bash
git clone https://github.com/SOFTWARE-ING/PFE.git
# ou avec SSH
# git clone git@github.com:SOFTWARE-ING/PFE.git

cd PFE/backend
```

### 2. Créer puis activer un environnement virtuel

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

## Configuration

Créez un fichier `.env` à la racine du projet `backend` ou dans le dossier parent (`/home/magistral/Documents/PFE`) et ajoutez les variables suivantes :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=signature_communiques_officiels
DB_USER=magistral
DB_PASSWORD=mot_de_passe

JWT_SECRET_KEY=change_me_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

BCRYPT_ROUNDS=12
OTP_EXPIRE_SECONDS=30
OTP_LENGTH=6

ENCRYPTION_KEY=<cle_fernet_32_bytes_base64>
```

### Générer une clé Fernet

Utilisez Python pour générer `ENCRYPTION_KEY` :

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Initialisation de la base de données

Avant de lancer l'API, créez la base de données PostgreSQL :

```bash
createdb -h localhost -p 5432 -U user signature_communiques_officiels
```

Puis initialisez les tables SQLAlchemy :

```bash
cd /home/magistral/Documents/PFE/backend
python -c "from app.core.database import init_db; init_db()"
```

> Note : `app/main.py` a une initialisation de base de données désactivée (`init_db()` commenté). Exécutez `init_db()` manuellement pour créer les tables.

## Sauvegarde et restauration de la base de données

### Exporter la base en fichier `.backup`

```bash
pg_dump -h localhost -p 5432 -U user -Fc signature_communiques_officiels -f signature_communiques_officiels.backup
```

### Importer depuis un fichier `.backup`

```bash
pg_restore -h localhost -p 5432 -U user -d signature_communiques_officiels signature_communiques_officiels.backup --clean --if-exists
```

> Astuce : si la base existe déjà et que vous voulez remplacer son contenu, vous pouvez d'abord la supprimer puis la recréer :

```bash
dropdb -h localhost -p 5432 -U user signature_communiques_officiels
createdb -h localhost -p 5432 -U user signature_communiques_officiels
pg_restore -h localhost -p 5432 -U user -d signature_communiques_officiels signature_communiques_officiels.backup --clean --if-exists
```

## Démarrage local

Lancer le serveur FastAPI :

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Puis ouvrir :

- API : `http://127.0.0.1:8000`
- Documentation interactive Swagger : `http://127.0.0.1:8000/docs`

## Structure des routes

Toutes les routes sont préfixées par `/api` dans `app/main.py`.

### Authentification / 2FA

Base : `/api/auth`

- `POST /api/auth/login`
  - Authentifie l'utilisateur avec:
        -> `jordanmagistral@gmail.com` et `kilane20035` //ADMIN_SYSTEM
        -> `magistraljordan@gmail.com` et `kilane20035` //AGENT_OFFICIEL
    Ou creer son propre uilisateur.
  - Si 2FA actif : renvoie un token temporaire et `requires_2fa=true`
  - Si 2FA inactif : renvoie un JWT final

- `POST /api/auth/2fa/request-email`
  - Envoie un code 2FA par email pour l'utilisateur connecté

- `POST /api/auth/verify-2fa`
  - Valide le code 2FA Google Authenticator ou email
  - Renvoie le JWT définitif

- `POST /api/auth/2fa/enable`
  - Active le 2FA pour l'utilisateur connecté
  - Renvoie le secret et le QR code à scanner

- `POST /api/auth/2fa/disable`
  - Désactive le 2FA pour l'utilisateur connecté

### Inscription

Base : `/api/register`

- `POST /api/register/agent`
  - Inscription d'un agent officiel

- `POST /api/register/admin`
  - Inscription d'un administrateur

- `POST /api/register/citoyen`
  - Inscription d'un citoyen

### OCR

Base : `/api/ocr`

- `POST /api/ocr/extract`
  - Upload de fichier : `pdf`, `docx`, `png`, `jpg`, `jpeg`
  - Retourne le texte extrait

### Recherche

Base : `/api/search`

- `GET /api/search/simple`
  - Recherche simple dans les communiqués publiés
  - Paramètres : `q`, `page`, `limit`

- `GET /api/search/advanced`
  - Recherche avancée avec filtres
  - Paramètres : `q`, `statut`, `date_debut`, `date_fin`, `id_auteur`, `tri`, `page`, `limit`

- `GET /api/search/highlights`
  - Recherche avec surbrillance des mots
  - Paramètres : `q`, `communique_id` (optionnel)

- `GET /api/search/suggestions`
  - Suggestions de recherche pour l'autocomplétion
  - Paramètres : `q`, `limit`

- `GET /api/search/popular`
  - Communiqués les plus consultés
  - Paramètre : `limit`

- `GET /api/search/recent`
  - Communiqués les plus récents
  - Paramètre : `limit`

- `GET /api/search/compare`
  - Compare plusieurs algorithmes de recherche

### Clés cryptographiques

Base : `/api/keys`

- `POST /api/keys/generate`
  - Génère une paire RSA pour l'agent officiel connecté

- `POST /api/keys/renew`
  - Renouvelle la paire de clés de l'agent

- `GET /api/keys/my-keys`
  - Liste les clés de l'agent connecté

### Signatures numériques

Base : `/api/signatures`

- `POST /api/signatures/sign`
  - Signe un communiqué avec RSA-PSS
  - Nécessite un agent officiel et une clé active

- `POST /api/signatures/verify`
  - Vérifie la validité cryptographique d'une signature

- `GET /api/signatures/validate/{communique_id}`
  - Vérifie l'intégrité de toutes les signatures d'un communiqué

- `GET /api/signatures/my-signatures`
  - Liste les signatures de l'agent connecté

## Authentification JWT

La plupart des routes protégées exigent l'en-tête HTTP :

```http
Authorization: Bearer <token>
```

Lorsque 2FA est activé, l'appel initial à `/api/auth/login` renvoie un token temporaire. Il doit être échangé contre un JWT final via `/api/auth/verify-2fa`.

## Notes importantes

- Le backend utilise PostgreSQL via SQLAlchemy.
- Les modèles sont définis dans `app/models/models.py`.
- Les schémas de validation des requêtes/réponses sont dans `app/schemas/schemas.py`.
- Le backend ne dépend pas d'un front-end spécifique ; il expose une API REST.

## Conseils de développement

- Utilisez `uvicorn` avec `--reload` pour le développement.
- Vérifiez la page Swagger sur `/docs` pour tester les routes.
- Si la base de données a déjà été initialisée, ne relancez pas `init_db()` sans sauvegarde.
